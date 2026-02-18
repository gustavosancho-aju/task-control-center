import { Prisma } from '@prisma/client'
import type { Task, AgentRole, TaskPriority } from '@prisma/client'
import prisma from '@/lib/db'
import { createClaudeJsonMessage } from '@/lib/ai/claude-client'
import { queueManager } from '@/lib/agents/queue-manager'
import { agentEventEmitter, AgentEventTypes } from '@/lib/agents/event-emitter'

// ============================================================================
// TYPES
// ============================================================================

export interface SubtaskPlan {
  title: string
  description: string
  agent: AgentRole
  estimatedHours: number
  priority: TaskPriority
  dependsOn: string[] // títulos exatos de outras subtarefas deste plano
}

export interface Phase {
  name: string
  subtasks: SubtaskPlan[]
}

export interface OrchestrationPlan {
  analysis: string
  phases: Phase[]
  estimatedTotalHours: number
  recommendedOrder: string[]
}

export interface OrchestrationResult {
  orchestrationId: string
  subtasksCreated: number
  plan: OrchestrationPlan
}

// ============================================================================
// MAESTRO ORCHESTRATOR
// ============================================================================

class MaestroOrchestrator {
  // --------------------------------------------------------------------------
  // orchestrate — ponto de entrada principal
  // --------------------------------------------------------------------------

  async orchestrate(taskId: string): Promise<OrchestrationResult> {
    const task = await prisma.task.findUnique({ where: { id: taskId } })
    if (!task) throw new Error(`Tarefa ${taskId} não encontrada`)

    if (task.status === 'DONE') {
      throw new Error('Não é possível orquestrar uma tarefa já concluída')
    }

    // Evita duplicar orquestração
    const existing = await prisma.orchestration.findUnique({ where: { parentTaskId: taskId } })
    if (existing && !['FAILED'].includes(existing.status)) {
      throw new Error(`Orquestração já existe para esta tarefa (id: ${existing.id}, status: ${existing.status})`)
    }

    // Cria (ou recria após falha) o registro de Orchestration
    const orchestration = existing
      ? await prisma.orchestration.update({
          where: { id: existing.id },
          data: { status: 'PLANNING', currentPhase: 'Reiniciando...', completedAt: null },
        })
      : await prisma.orchestration.create({
          data: { parentTaskId: taskId, status: 'PLANNING', currentPhase: 'Iniciando análise...' },
        })

    console.log(`[Maestro] Orquestração iniciada: ${orchestration.id} para tarefa "${task.title}"`)

    try {
      // FASE 1 — Planejamento com IA
      await this._updateOrchestration(orchestration.id, {
        status: 'PLANNING',
        currentPhase: 'Analisando tarefa com IA...',
      })

      const plan = await this.planTask(task)

      await this._updateOrchestration(orchestration.id, {
        plan: plan as unknown as Prisma.InputJsonValue,
        currentPhase: 'Plano criado',
      })

      // FASE 2 — Criar subtarefas no banco
      await this._updateOrchestration(orchestration.id, {
        status: 'CREATING_SUBTASKS',
        currentPhase: 'Criando subtarefas...',
      })

      const subtasks = await this.createSubtasks(orchestration.id, task, plan)

      await this._updateOrchestration(orchestration.id, {
        totalSubtasks: subtasks.length,
        currentPhase: `${subtasks.length} subtarefas criadas`,
      })

      // FASE 3 — Atribuir agentes
      await this._updateOrchestration(orchestration.id, {
        status: 'ASSIGNING_AGENTS',
        currentPhase: 'Atribuindo agentes...',
      })

      await this.assignAgents(subtasks)

      // FASE 4 — Enfileirar execução
      await this._updateOrchestration(orchestration.id, {
        status: 'EXECUTING',
        currentPhase: 'Enfileirando subtarefas prontas para execução...',
      })

      await this.queueForExecution(orchestration.id, subtasks)

      await this._updateOrchestration(orchestration.id, {
        currentPhase: `0/${subtasks.length} subtarefas concluídas`,
      })

      // Notifica o sistema que execução começou
      agentEventEmitter.emit(AgentEventTypes.EXECUTION_STARTED, {}, { taskId })

      console.log(`[Maestro] Orquestração ${orchestration.id} em execução com ${subtasks.length} subtarefas`)

      return {
        orchestrationId: orchestration.id,
        subtasksCreated: subtasks.length,
        plan,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      await this._updateOrchestration(orchestration.id, {
        status: 'FAILED',
        currentPhase: `Erro: ${message}`,
        completedAt: new Date(),
      })
      throw error
    }
  }

  // --------------------------------------------------------------------------
  // planTask — chama Claude para decompor a tarefa em fases e subtarefas
  // --------------------------------------------------------------------------

  async planTask(task: Task): Promise<OrchestrationPlan> {
    const systemPrompt = `Você é o MAESTRO, agente orquestrador especialista em planejamento de projetos de software.

Sua função é decompor tarefas complexas em subtarefas menores e atribuir cada uma ao agente mais adequado.

Agentes disponíveis:
- MAESTRO: Planejamento, coordenação, roadmaps, gestão de projetos, documentação técnica
- SENTINEL: Code review, testes unitários/integração/E2E, segurança, performance, qualidade
- ARCHITECTON: Arquitetura de sistemas, banco de dados, infraestrutura, APIs, decisões técnicas estruturais
- PIXEL: UI/UX, componentes visuais, CSS, design systems, responsividade, acessibilidade

Regras obrigatórias:
1. Crie subtarefas ATÔMICAS — cada uma deve ser executável por um único agente
2. Agrupe em 2-3 fases lógicas (ex: Planejamento → Implementação → Revisão)
3. "dependsOn" deve conter TÍTULOS EXATOS de outras subtarefas deste plano
4. Estime horas de forma realista (ARCHITECTON: 2-4h, PIXEL: 1-3h, SENTINEL: 1-2h)
5. Máximo de 4 subtarefas por fase, 3 fases no total
6. Prioridades válidas: "LOW", "MEDIUM", "HIGH", "URGENT"
7. Roles válidos: "MAESTRO", "SENTINEL", "ARCHITECTON", "PIXEL"

RETORNE APENAS JSON VÁLIDO, sem markdown, sem comentários.`

    const prompt = `Decomponha esta tarefa em subtarefas executáveis:

Título: ${task.title}
Descrição: ${task.description ?? 'Sem descrição fornecida'}
Prioridade atual: ${task.priority}
Estimativa: ${task.estimatedHours ? `${task.estimatedHours}h` : 'Não definida'}

Formato de resposta (JSON puro):
{
  "analysis": "Análise concisa da complexidade, abordagem e pontos críticos",
  "phases": [
    {
      "name": "Fase 1 — Planejamento e Arquitetura",
      "subtasks": [
        {
          "title": "Definir arquitetura do sistema",
          "description": "Criar diagrama de componentes, definir stack tecnológica e padrões de projeto",
          "agent": "ARCHITECTON",
          "estimatedHours": 3,
          "priority": "HIGH",
          "dependsOn": []
        }
      ]
    }
  ],
  "estimatedTotalHours": 12,
  "recommendedOrder": ["Título subtarefa 1", "Título subtarefa 2", "..."]
}`

    const plan = await createClaudeJsonMessage<OrchestrationPlan>(prompt, systemPrompt)

    // Valida campos críticos
    if (!plan.phases || !Array.isArray(plan.phases)) {
      throw new Error('Plano inválido retornado pela IA: campo "phases" ausente ou inválido')
    }

    return plan
  }

  // --------------------------------------------------------------------------
  // createSubtasks — cria as Task no banco com relações de dependência
  // --------------------------------------------------------------------------

  async createSubtasks(
    orchestrationId: string,
    parentTask: Task,
    plan: OrchestrationPlan
  ): Promise<Task[]> {
    // Achata todas as subtarefas de todas as fases
    const allSubtaskPlans = plan.phases.flatMap(phase => phase.subtasks)

    // Pré-carrega agentes por role para evitar múltiplas queries
    const agents = await prisma.agent.findMany({
      where: { isActive: true },
      select: { id: true, name: true, role: true },
    })
    const agentByRole = new Map(agents.map(a => [a.role, a]))

    // 1ª passada: cria todas as tarefas (sem dependências ainda)
    const createdTasks: Task[] = []
    const titleToId = new Map<string, string>()

    for (const subtaskPlan of allSubtaskPlans) {
      const agent = agentByRole.get(subtaskPlan.agent)

      const task = await prisma.task.create({
        data: {
          title: subtaskPlan.title,
          description: subtaskPlan.description,
          priority: subtaskPlan.priority,
          status: 'TODO',
          parentId: parentTask.id,
          orchestrationId,
          autoCreated: true,
          estimatedHours: subtaskPlan.estimatedHours,
          dueDate: parentTask.dueDate,
          agentId: agent?.id ?? null,
          agentName: agent?.name ?? null,
        },
      })

      createdTasks.push(task)
      titleToId.set(subtaskPlan.title, task.id)
    }

    // 2ª passada: cria as relações de dependência
    for (const subtaskPlan of allSubtaskPlans) {
      const taskId = titleToId.get(subtaskPlan.title)
      if (!taskId || subtaskPlan.dependsOn.length === 0) continue

      const dependencyIds = subtaskPlan.dependsOn
        .map(title => titleToId.get(title))
        .filter((id): id is string => !!id)

      if (dependencyIds.length > 0) {
        await prisma.task.update({
          where: { id: taskId },
          data: {
            dependsOn: { connect: dependencyIds.map(id => ({ id })) },
          },
        })
        console.log(
          `[Maestro] Dependência: "${subtaskPlan.title}" → [${subtaskPlan.dependsOn.join(', ')}]`
        )
      }
    }

    return createdTasks
  }

  // --------------------------------------------------------------------------
  // assignAgents — confirma/corrige atribuição de agentes por subtarefa
  // --------------------------------------------------------------------------

  async assignAgents(subtasks: Task[]): Promise<void> {
    // Agentes já foram atribuídos em createSubtasks via role do plano.
    // Este método re-verifica e tenta atribuir para tarefas que ficaram sem agente.

    const tasks = await prisma.task.findMany({
      where: { id: { in: subtasks.map(t => t.id) } },
      select: { id: true, title: true, agentId: true },
    })

    const unassigned = tasks.filter(t => !t.agentId)

    if (unassigned.length === 0) {
      console.log(`[Maestro] Todos os ${subtasks.length} agentes atribuídos com sucesso`)
      return
    }

    console.log(`[Maestro] ${unassigned.length} subtarefa(s) sem agente — tentando auto-assign via IA`)

    const { analyzeTask } = await import('@/lib/ai/task-analyzer')

    for (const task of unassigned) {
      try {
        const subtask = subtasks.find(s => s.id === task.id)
        const analysis = await analyzeTask(
          task.title,
          subtask?.description ?? undefined
        )
        if (!analysis) continue

        const agent = await prisma.agent.findFirst({
          where: { role: analysis.suggestedAgent as AgentRole, isActive: true },
          select: { id: true, name: true },
        })

        if (agent) {
          await prisma.task.update({
            where: { id: task.id },
            data: { agentId: agent.id, agentName: agent.name },
          })
          console.log(`[Maestro] Auto-assign: "${task.title}" → ${agent.name}`)
        }
      } catch (err) {
        console.warn(`[Maestro] Falha ao auto-assign "${task.title}":`, err)
      }
    }
  }

  // --------------------------------------------------------------------------
  // queueForExecution — topological sort → enfileira apenas tarefas prontas
  // --------------------------------------------------------------------------

  async queueForExecution(orchestrationId: string, subtasks: Task[]): Promise<void> {
    const tasksWithDeps = await prisma.task.findMany({
      where: { orchestrationId },
      include: { dependsOn: { select: { id: true, status: true } } },
    })

    let queued = 0

    for (const task of tasksWithDeps) {
      if (!task.agentId) {
        console.warn(`[Maestro] Pulando "${task.title}" — sem agente atribuído`)
        continue
      }

      const pendingDeps = task.dependsOn.filter(dep => dep.status !== 'DONE')

      if (pendingDeps.length > 0) {
        console.log(
          `[Maestro] "${task.title}" aguarda ${pendingDeps.length} dependência(s)`
        )
        continue
      }

      // Sem dependências pendentes — enfileira imediatamente
      const existing = await prisma.agentQueue.findUnique({ where: { taskId: task.id } })
      if (!existing) {
        await queueManager.addToQueue(task.id, task.agentId, {
          priority: this._priorityToNumber(task.priority as TaskPriority),
        })
        queued++
        console.log(`[Maestro] Enfileirado (prioridade ${this._priorityToNumber(task.priority as TaskPriority)}): "${task.title}"`)
      }
    }

    console.log(`[Maestro] ${queued}/${tasksWithDeps.length} subtarefas enfileiradas`)
  }

  // --------------------------------------------------------------------------
  // monitorExecution — verifica progresso e desbloqueia dependentes
  //                    Chamado pelo AutoProcessor a cada tick
  // --------------------------------------------------------------------------

  async monitorExecution(orchestrationId: string): Promise<void> {
    const orchestration = await prisma.orchestration.findUnique({
      where: { id: orchestrationId },
    })

    if (!orchestration) return
    if (['COMPLETED', 'FAILED'].includes(orchestration.status)) return

    const subtasks = await prisma.task.findMany({
      where: { orchestrationId },
      include: { dependsOn: { select: { id: true, status: true } } },
    })

    const total = subtasks.length
    const done = subtasks.filter(t => t.status === 'DONE').length

    // Desbloqueia tarefas cujas dependências foram concluídas
    let unlocked = 0
    for (const task of subtasks) {
      if (task.status !== 'TODO') continue

      const allDepsDone = task.dependsOn.every(dep => dep.status === 'DONE')
      if (!allDepsDone) continue
      if (!task.agentId) continue

      const existing = await prisma.agentQueue.findUnique({ where: { taskId: task.id } })
      if (!existing) {
        await queueManager.addToQueue(task.id, task.agentId, {
          priority: this._priorityToNumber(task.priority as TaskPriority),
        })
        unlocked++
        console.log(`[Maestro] Desbloqueado: "${task.title}"`)
      }
    }

    // Atualiza contadores e fase
    await this._updateOrchestration(orchestrationId, {
      completedSubtasks: done,
      currentPhase: `${done}/${total} subtarefas concluídas${unlocked > 0 ? ` (+${unlocked} desbloqueadas)` : ''}`,
      updatedAt: new Date(),
    })

    // Verifica conclusão
    if (done === total) {
      await this._updateOrchestration(orchestrationId, {
        status: 'COMPLETED',
        completedSubtasks: total,
        completedAt: new Date(),
        currentPhase: `Todas as ${total} subtarefas concluídas`,
      })
      console.log(`[Maestro] ✅ Orquestração ${orchestrationId} CONCLUÍDA`)

      agentEventEmitter.emit(AgentEventTypes.EXECUTION_COMPLETED, {}, {
        taskId: orchestration.parentTaskId,
      })
      return
    }

    // Verifica se parou de progredir (todas em TODO sem agente — falha estrutural)
    const todo = subtasks.filter(t => t.status === 'TODO')
    const inProgress = subtasks.filter(t => t.status === 'IN_PROGRESS')
    const allStuck = todo.length > 0 && inProgress.length === 0 && unlocked === 0

    if (allStuck) {
      // Checa se há itens na fila ainda
      const inQueue = await prisma.agentQueue.count({
        where: {
          taskId: { in: subtasks.map(t => t.id) },
          status: { in: ['PENDING', 'PROCESSING'] },
        },
      })
      if (inQueue === 0) {
        console.warn(`[Maestro] Orquestração ${orchestrationId} parece travada — nenhuma tarefa em progresso`)
      }
    }
  }

  // --------------------------------------------------------------------------
  // Helpers privados
  // --------------------------------------------------------------------------

  private async _updateOrchestration(
    id: string,
    data: Prisma.OrchestrationUpdateInput
  ): Promise<void> {
    await prisma.orchestration.update({ where: { id }, data })
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

const globalForMaestro = globalThis as unknown as {
  maestroOrchestrator: MaestroOrchestrator | undefined
}

export const maestroOrchestrator =
  globalForMaestro.maestroOrchestrator ?? new MaestroOrchestrator()

if (process.env.NODE_ENV !== 'production') {
  globalForMaestro.maestroOrchestrator = maestroOrchestrator
}

export { MaestroOrchestrator }
