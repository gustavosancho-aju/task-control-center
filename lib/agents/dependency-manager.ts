import type { Task, TaskPriority } from '@prisma/client'
import prisma from '@/lib/db'
import { queueManager } from '@/lib/agents/queue-manager'
import { agentEventEmitter, AgentEventTypes } from '@/lib/agents/event-emitter'
import type { OrchestrationPlan } from '@/lib/agents/maestro-orchestrator'
import { cache } from '@/lib/cache'

// ============================================================================
// TYPES
// ============================================================================

export interface DependencyNode {
  taskId: string
  title: string
  priority: TaskPriority
  level: number              // nível de execução (0 = sem deps)
  dependsOn: string[]        // IDs de tarefas que esta depende
  dependents: string[]       // IDs de tarefas que dependem desta
}

export interface DependencyGraph {
  nodes: Map<string, DependencyNode>
  levels: string[][]         // tasks agrupadas por nível de execução
  hasCycle: boolean
  cycleDetails?: string      // descrição do ciclo detectado
  totalLevels: number
  canParallelize: boolean    // true se algum nível tem >1 task
}

export interface ExecutionLevel {
  level: number
  taskIds: string[]
  titles: string[]
  canParallelize: boolean
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  graph?: DependencyGraph
}

// Tipo mínimo aceito por buildDependencyGraph e getExecutionOrder
export type TaskWithDeps = Pick<Task, 'id' | 'title' | 'priority'> & {
  dependsOn: Pick<Task, 'id'>[]
}

// ============================================================================
// DEPENDENCY MANAGER
// ============================================================================

class DependencyManager {
  constructor() {
    // Escuta evento de conclusão de tarefa e dispara verificação de dependentes
    agentEventEmitter.on(AgentEventTypes.QUEUE_PROCESSED, (payload) => {
      const data = payload.data as { status?: string }
      if (data?.status === 'COMPLETED' && payload.taskId) {
        this.onTaskCompleted(payload.taskId).catch(err =>
          console.error('[DependencyManager] onTaskCompleted error:', err)
        )
      }
    })
  }

  // --------------------------------------------------------------------------
  // buildDependencyGraph
  // Constrói o grafo de dependências e calcula níveis de execução.
  // Detecta ciclos via DFS com coloração tricolor.
  // --------------------------------------------------------------------------

  buildDependencyGraph(tasks: TaskWithDeps[]): DependencyGraph {
    const nodes = new Map<string, DependencyNode>()

    // Inicializa nós
    for (const task of tasks) {
      nodes.set(task.id, {
        taskId: task.id,
        title: task.title,
        priority: task.priority as TaskPriority,
        level: -1,
        dependsOn: task.dependsOn.map(d => d.id),
        dependents: [],
      })
    }

    // Preenche dependents (inverso de dependsOn)
    for (const node of nodes.values()) {
      for (const depId of node.dependsOn) {
        const depNode = nodes.get(depId)
        if (depNode && !depNode.dependents.includes(node.taskId)) {
          depNode.dependents.push(node.taskId)
        }
      }
    }

    // Detecção de ciclos via DFS tricolor (WHITE=0, GRAY=1, BLACK=2)
    const color = new Map<string, 0 | 1 | 2>()
    let cycleDetails: string | undefined

    for (const id of nodes.keys()) {
      color.set(id, 0)
    }

    const dfsStack: string[] = []

    function dfs(id: string): boolean /* hasCycle */ {
      color.set(id, 1)
      dfsStack.push(id)

      const node = nodes.get(id)!
      for (const depId of node.dependsOn) {
        const c = color.get(depId)
        if (c === 1) {
          // Ciclo detectado: extrai o caminho
          const cycleStart = dfsStack.indexOf(depId)
          const cycle = dfsStack.slice(cycleStart).map(tid => nodes.get(tid)?.title ?? tid)
          cycle.push(nodes.get(depId)?.title ?? depId) // fecha o ciclo
          cycleDetails = cycle.join(' → ')
          return true
        }
        if (c === 0 && dfs(depId)) return true
      }

      dfsStack.pop()
      color.set(id, 2)
      return false
    }

    let hasCycle = false
    for (const id of nodes.keys()) {
      if (color.get(id) === 0) {
        if (dfs(id)) {
          hasCycle = true
          break
        }
      }
    }

    if (hasCycle) {
      return {
        nodes,
        levels: [],
        hasCycle: true,
        cycleDetails,
        totalLevels: 0,
        canParallelize: false,
      }
    }

    // Calcula níveis via Kahn's algorithm (BFS topológico)
    const inDegree = new Map<string, number>()
    for (const node of nodes.values()) {
      inDegree.set(node.taskId, node.dependsOn.length)
    }

    const levels: string[][] = []
    let currentLevel = inDegree.size > 0 ? 0 : -1
    let queue = [...inDegree.entries()]
      .filter(([, deg]) => deg === 0)
      .map(([id]) => id)

    while (queue.length > 0) {
      // Ordena o nível atual por prioridade (URGENT > HIGH > MEDIUM > LOW)
      queue.sort((a, b) => {
        const pa = this._priorityToNumber(nodes.get(a)!.priority)
        const pb = this._priorityToNumber(nodes.get(b)!.priority)
        return pb - pa
      })

      levels.push(queue)

      for (const id of queue) {
        const node = nodes.get(id)!
        node.level = currentLevel

        for (const depId of node.dependents) {
          const newDeg = (inDegree.get(depId) ?? 0) - 1
          inDegree.set(depId, newDeg)
        }
      }

      currentLevel++
      queue = [...inDegree.entries()]
        .filter(([, deg]) => deg === 0)
        .filter(([id]) => nodes.get(id)!.level === -1)
        .map(([id]) => id)
    }

    const canParallelize = levels.some(lvl => lvl.length > 1)

    return {
      nodes,
      levels,
      hasCycle: false,
      totalLevels: levels.length,
      canParallelize,
    }
  }

  // --------------------------------------------------------------------------
  // getReadyTasks
  // Retorna tarefas de uma orquestração prontas para execução:
  // todas as dependências estão DONE e a tarefa ainda não foi enfileirada.
  // --------------------------------------------------------------------------

  async getReadyTasks(orchestrationId: string): Promise<Task[]> {
    const subtasks = await prisma.task.findMany({
      where: { orchestrationId, status: 'TODO' },
      include: { dependsOn: { select: { id: true, status: true } } },
    })

    const readyTaskIds = subtasks
      .filter(task => task.dependsOn.every(dep => dep.status === 'DONE'))
      .map(task => task.id)

    if (readyTaskIds.length === 0) return []

    // Filtra as que NÃO estão na fila ou em execução
    const alreadyQueued = await prisma.agentQueue.findMany({
      where: {
        taskId: { in: readyTaskIds },
        status: { in: ['PENDING', 'PROCESSING'] },
      },
      select: { taskId: true },
    })

    const queuedIds = new Set(alreadyQueued.map(q => q.taskId))

    return subtasks.filter(
      task => readyTaskIds.includes(task.id) && !queuedIds.has(task.id)
    )
  }

  // --------------------------------------------------------------------------
  // onTaskCompleted
  // Chamado automaticamente via evento QUEUE_PROCESSED.
  // Verifica dependentes desbloqueados, enfileira e atualiza orquestração.
  // --------------------------------------------------------------------------

  async onTaskCompleted(taskId: string): Promise<void> {
    // Busca a tarefa completada com seus dependentes e orchestrationId
    const completedTask = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        title: true,
        orchestrationId: true,
        dependents: {
          select: {
            id: true,
            title: true,
            status: true,
            agentId: true,
            priority: true,
            orchestrationId: true,
            dependsOn: { select: { id: true, status: true } },
          },
        },
      },
    })

    if (!completedTask) return

    let unlocked = 0

    // Verifica cada dependente
    for (const dependent of completedTask.dependents) {
      if (dependent.status !== 'TODO') continue
      if (!dependent.agentId) continue
      if (!dependent.orchestrationId) continue

      // Só desbloqueia se TODAS as dependências desta tarefa estão DONE
      const allDepsDone = dependent.dependsOn.every(dep => dep.status === 'DONE')
      if (!allDepsDone) continue

      // Verifica se já está na fila
      const inQueue = await prisma.agentQueue.findUnique({
        where: { taskId: dependent.id },
      })
      if (inQueue) continue

      // Enfileira com prioridade da tarefa
      await queueManager.addToQueue(dependent.id, dependent.agentId, {
        priority: this._priorityToNumber(dependent.priority as TaskPriority),
      })

      unlocked++
      console.log(
        `[DependencyManager] ✓ "${completedTask.title}" concluída → desbloqueou "${dependent.title}"`
      )
    }

    // Atualiza progresso da orchestration (se a tarefa pertence a uma)
    if (completedTask.orchestrationId) {
      await this._updateOrchestrationProgress(completedTask.orchestrationId)
    }

    if (unlocked > 0) {
      console.log(
        `[DependencyManager] ${unlocked} tarefa(s) desbloqueada(s) após conclusão de "${completedTask.title}"`
      )
    }
  }

  // --------------------------------------------------------------------------
  // getExecutionOrder
  // Retorna as tarefas na ordem topológica de execução,
  // com prioridades respeitadas dentro do mesmo nível.
  // --------------------------------------------------------------------------

  getExecutionOrder(tasks: TaskWithDeps[]): TaskWithDeps[] {
    const graph = this.buildDependencyGraph(tasks)

    if (graph.hasCycle) {
      throw new Error(
        `Dependências circulares detectadas: ${graph.cycleDetails}`
      )
    }

    // Retorna tasks na ordem dos níveis (já ordenados por prioridade)
    const ordered: TaskWithDeps[] = []
    const taskById = new Map(tasks.map(t => [t.id, t]))

    for (const level of graph.levels) {
      for (const taskId of level) {
        const task = taskById.get(taskId)
        if (task) ordered.push(task)
      }
    }

    return ordered
  }

  // --------------------------------------------------------------------------
  // validateDependencies
  // Valida o plano de orquestração antes de criar as subtarefas no banco.
  // Trabalha com títulos (não IDs, pois as tasks ainda não existem).
  // --------------------------------------------------------------------------

  validateDependencies(plan: OrchestrationPlan): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    const allSubtasks = plan.phases.flatMap(p => p.subtasks)
    const allTitles = new Set(allSubtasks.map(s => s.title))

    // 1. Títulos duplicados
    const titleCounts = new Map<string, number>()
    for (const s of allSubtasks) {
      titleCounts.set(s.title, (titleCounts.get(s.title) ?? 0) + 1)
    }
    for (const [title, count] of titleCounts.entries()) {
      if (count > 1) {
        errors.push(`Título duplicado: "${title}" aparece ${count} vezes`)
      }
    }

    // 2. Dependências referenciadas que não existem no plano
    for (const subtask of allSubtasks) {
      for (const dep of subtask.dependsOn) {
        if (!allTitles.has(dep)) {
          errors.push(
            `"${subtask.title}" depende de "${dep}" que não existe no plano`
          )
        }
        if (dep === subtask.title) {
          errors.push(`"${subtask.title}" depende de si mesma`)
        }
      }
    }

    if (errors.length > 0) {
      return { valid: false, errors, warnings }
    }

    // 3. Detecção de ciclos no grafo título-baseado
    const adj = new Map<string, string[]>()
    for (const s of allSubtasks) {
      adj.set(s.title, s.dependsOn)
    }

    const color = new Map<string, 0 | 1 | 2>()
    for (const title of allTitles) color.set(title, 0)

    const stack: string[] = []
    let cycleDetails: string | undefined

    function dfs(title: string): boolean {
      color.set(title, 1)
      stack.push(title)
      for (const dep of adj.get(title) ?? []) {
        const c = color.get(dep)
        if (c === 1) {
          const start = stack.indexOf(dep)
          const cycle = [...stack.slice(start), dep]
          cycleDetails = cycle.join(' → ')
          return true
        }
        if (c === 0 && dfs(dep)) return true
      }
      stack.pop()
      color.set(title, 2)
      return false
    }

    for (const title of allTitles) {
      if (color.get(title) === 0 && dfs(title)) {
        errors.push(`Dependência circular detectada: ${cycleDetails}`)
        return { valid: false, errors, warnings }
      }
    }

    // 4. Warnings: subtasks sem dependências (ilhas) que poderiam ser paralelas
    const tasksWithDeps = allSubtasks.filter(s => s.dependsOn.length > 0)
    const tasksInDeps = new Set(allSubtasks.flatMap(s => s.dependsOn))
    const orphans = allSubtasks.filter(
      s => s.dependsOn.length === 0 && !tasksInDeps.has(s.title)
    )
    if (orphans.length > 1) {
      warnings.push(
        `${orphans.length} subtarefas sem dependências podem executar em paralelo: ` +
        orphans.map(s => `"${s.title}"`).join(', ')
      )
    }

    // 5. Constrói grafo final para retornar junto
    const tasksForGraph: TaskWithDeps[] = allSubtasks.map((s, i) => ({
      id: String(i), // ID temporário para o grafo
      title: s.title,
      priority: s.priority,
      dependsOn: s.dependsOn
        .map(depTitle => allSubtasks.findIndex(x => x.title === depTitle))
        .filter(idx => idx !== -1)
        .map(idx => ({ id: String(idx) })),
    }))

    const graph = this.buildDependencyGraph(tasksForGraph)

    // 6. Warning: cadeia muito longa (gargalo sequencial)
    if (graph.totalLevels > 5) {
      warnings.push(
        `Cadeia de dependências profunda (${graph.totalLevels} níveis) — considere paralelizar`
      )
    }

    if (tasksWithDeps.length === 0 && allSubtasks.length > 1) {
      warnings.push('Nenhuma dependência definida — todas as subtarefas executarão em paralelo')
    }

    return { valid: true, errors: [], warnings, graph }
  }

  // --------------------------------------------------------------------------
  // Helpers privados
  // --------------------------------------------------------------------------

  private async _updateOrchestrationProgress(orchestrationId: string): Promise<void> {
    const [total, done] = await Promise.all([
      prisma.task.count({ where: { orchestrationId } }),
      prisma.task.count({ where: { orchestrationId, status: 'DONE' } }),
    ])

    const isAllDone = done === total && total > 0

    await prisma.orchestration.update({
      where: { id: orchestrationId },
      data: {
        completedSubtasks: done,
        currentPhase: isAllDone
          ? `Todas as ${total} subtarefas concluídas`
          : `${done}/${total} subtarefas concluídas`,
        ...(isAllDone
          ? { status: 'COMPLETED', completedAt: new Date() }
          : {}),
      },
    })

    if (isAllDone) {
      const orchestration = await prisma.orchestration.findUnique({
        where: { id: orchestrationId },
        select: { parentTaskId: true },
      })
      if (orchestration) {
        agentEventEmitter.emit(
          AgentEventTypes.EXECUTION_COMPLETED,
          { orchestrationId, totalSubtasks: total },
          { taskId: orchestration.parentTaskId }
        )

        // Auto-complete: marcar task pai como DONE
        if (orchestration.parentTaskId) {
          const parentTask = await prisma.task.findUnique({
            where: { id: orchestration.parentTaskId },
            select: { status: true },
          })
          if (parentTask && parentTask.status !== 'DONE') {
            await prisma.task.update({
              where: { id: orchestration.parentTaskId },
              data: { status: 'DONE', completedAt: new Date() },
            })
            await prisma.statusChange.create({
              data: {
                taskId: orchestration.parentTaskId,
                fromStatus: parentTask.status,
                toStatus: 'DONE',
                notes: `Concluída automaticamente — todas as ${total} subtarefas finalizadas`,
              },
            })
            cache.invalidatePattern('tasks:*')
            console.log(`[DependencyManager] ✅ Task pai auto-completada (${total} subtarefas concluídas)`)
          }
        }

        console.log(`[DependencyManager] 🎉 Orquestração ${orchestrationId} CONCLUÍDA (${total} subtarefas)`)
      }
    }
  }

  private _priorityToNumber(priority: TaskPriority): number {
    const map: Record<TaskPriority, number> = {
      URGENT: 10,
      HIGH: 7,
      MEDIUM: 4,
      LOW: 1,
    }
    return map[priority] ?? 4
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

const globalForDeps = globalThis as unknown as {
  dependencyManager: DependencyManager | undefined
}

export const dependencyManager =
  globalForDeps.dependencyManager ?? new DependencyManager()

if (process.env.NODE_ENV !== 'production') {
  globalForDeps.dependencyManager = dependencyManager
}

export { DependencyManager }
