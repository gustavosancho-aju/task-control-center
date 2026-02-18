import prisma from '@/lib/db'
import { createClaudeMessage } from '@/lib/ai/claude-client'
import { agentEventEmitter, AgentEventTypes } from '@/lib/agents/event-emitter'
import { dependencyManager } from '@/lib/agents/dependency-manager'
import type { OrchestrationPlan, Phase } from '@/lib/agents/maestro-orchestrator'
import type {
  Task,
  Agent,
  AgentExecution,
  AgentRole,
  LogLevel,
} from '@prisma/client'

// ============================================================================
// INTERFACES
// ============================================================================

export interface ExecutionResult {
  success: boolean
  result?: string
  error?: string
  artifacts?: string[]
}

export interface ExecutionContext {
  execution: AgentExecution
  agent: Agent
  task: Task
  log: (level: LogLevel, message: string, data?: unknown) => Promise<void>
  updateProgress: (progress: number) => Promise<void>
  requestHumanReview: (reason: string) => Promise<void>
}

export interface AgentCapability {
  name: string
  description: string
  execute: (task: Task, context: ExecutionContext) => Promise<ExecutionResult>
}

// ============================================================================
// AGENT ROLE PROMPTS
// ============================================================================

const ROLE_SYSTEM_PROMPTS: Record<AgentRole, string> = {
  MAESTRO: `Você é o MAESTRO, agente orquestrador especializado em:
- Planejamento e coordenação de projetos
- Gestão de múltiplas tarefas e dependências
- Definição de estratégias e roadmaps
- Coordenação entre diferentes áreas
Analise a tarefa e forneça um plano detalhado de execução.`,

  SENTINEL: `Você é o SENTINEL, guardião da qualidade especializado em:
- Code review e análise de código
- Testes (unitários, integração, E2E)
- Segurança e vulnerabilidades
- Performance e otimização
- Padrões e best practices
Analise a tarefa e forneça recomendações de qualidade.`,

  ARCHITECTON: `Você é o ARCHITECTON, arquiteto de sistemas especializado em:
- Arquitetura de sistemas e aplicações
- Design de banco de dados e modelagem
- Infraestrutura e DevOps
- Integrações e APIs
- Decisões técnicas estruturais
Analise a tarefa e proponha uma solução arquitetural.`,

  PIXEL: `Você é o PIXEL, designer de interface especializado em:
- UI/UX e design de interfaces
- Componentes visuais e layouts
- CSS, estilização e responsividade
- Design systems e padrões visuais
- Acessibilidade e experiência do usuário
Analise a tarefa e proponha melhorias de interface.`,
}

// ============================================================================
// EXECUTION ENGINE
// ============================================================================

class ExecutionEngine {
  private capabilities = new Map<AgentRole, AgentCapability[]>()
  private activeExecutions = new Set<string>()
  private concurrencyLimit = 2

  registerCapability(agentRole: AgentRole, capability: AgentCapability): void {
    const existing = this.capabilities.get(agentRole) ?? []
    existing.push(capability)
    this.capabilities.set(agentRole, existing)
  }

  async executeTask(taskId: string, agentId: string): Promise<ExecutionResult> {
    const task = await prisma.task.findUnique({ where: { id: taskId } })
    if (!task) throw new Error(`Tarefa ${taskId} não encontrada`)

    const agent = await prisma.agent.findUnique({ where: { id: agentId } })
    if (!agent) throw new Error(`Agente ${agentId} não encontrado`)

    const execution = await prisma.agentExecution.create({
      data: {
        taskId,
        agentId,
        status: 'RUNNING',
        startedAt: new Date(),
      },
    })

    this.activeExecutions.add(execution.id)

    // Atualiza task para IN_PROGRESS ao iniciar execução
    await prisma.task.update({
      where: { id: taskId },
      data: { status: 'IN_PROGRESS' },
    }).catch(() => {})

    const eventMeta = { executionId: execution.id, taskId, agentId }

    agentEventEmitter.emit(
      AgentEventTypes.EXECUTION_STARTED,
      { agentName: agent.name, taskTitle: task.title },
      eventMeta
    )
    agentEventEmitter.emit(AgentEventTypes.AGENT_BUSY, { agentName: agent.name }, eventMeta)

    const context = this.buildContext(execution, agent, task)

    try {
      await context.log('INFO', `Execução iniciada pelo agente ${agent.name}`)
      await context.updateProgress(10)

      // Check for registered custom capabilities first
      const capabilities = this.capabilities.get(agent.role) ?? []
      let result: ExecutionResult

      if (capabilities.length > 0) {
        await context.log('INFO', `Executando ${capabilities.length} capacidade(s) registrada(s)`)
        result = await this.runCapabilities(capabilities, task, context)
      } else {
        await context.log('INFO', 'Executando análise via Claude AI')
        result = await this.runClaudeExecution(agent, task, context)
      }

      if (!this.activeExecutions.has(execution.id)) {
        return { success: false, error: 'Execução cancelada' }
      }

      await context.updateProgress(100)

      const finalStatus = result.success ? 'COMPLETED' as const : 'FAILED' as const
      await prisma.agentExecution.update({
        where: { id: execution.id },
        data: {
          status: finalStatus,
          completedAt: new Date(),
          result: result.result ?? null,
          error: result.error ?? null,
          metadata: result.artifacts ? { artifacts: result.artifacts } : undefined,
        },
      })

      // Atualiza task para DONE em caso de sucesso
      if (result.success) {
        await prisma.task.update({
          where: { id: taskId },
          data: { status: 'DONE' },
        }).catch(() => {})
      }

      agentEventEmitter.emit(
        result.success ? AgentEventTypes.EXECUTION_COMPLETED : AgentEventTypes.EXECUTION_FAILED,
        result.success ? { result: result.result } : { error: result.error },
        eventMeta
      )

      await context.log(
        result.success ? 'INFO' : 'ERROR',
        result.success ? 'Execução concluída com sucesso' : `Execução falhou: ${result.error}`
      )

      // Hook de orquestração: libera dependências e verifica conclusão de fase
      if (result.success) {
        this.onExecutionCompleted(task, result).catch(err =>
          console.error('[ExecutionEngine] onExecutionCompleted error:', err)
        )
      }

      // Auto-comment do agente na tarefa
      try {
        const summary = result.success
          ? `Execução concluída com sucesso. Resultado disponível na aba de execuções.`
          : `Execução falhou: ${result.error}`
        await prisma.comment.create({
          data: {
            taskId,
            content: summary,
            authorName: agent.name,
            authorType: 'AGENT',
          },
        })
      } catch {
        // Não bloqueia se o comentário falhar
      }

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)

      await prisma.agentExecution.update({
        where: { id: execution.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          error: errorMessage,
        },
      })

      agentEventEmitter.emit(
        AgentEventTypes.EXECUTION_FAILED,
        { error: errorMessage },
        eventMeta
      )

      await context.log('ERROR', `Erro fatal: ${errorMessage}`)

      // Auto-comment de erro
      try {
        await prisma.comment.create({
          data: {
            taskId,
            content: `Erro durante execução: ${errorMessage}`,
            authorName: agent.name,
            authorType: 'AGENT',
          },
        })
      } catch {
        // Não bloqueia
      }

      return { success: false, error: errorMessage }
    } finally {
      this.activeExecutions.delete(execution.id)
      agentEventEmitter.emit(AgentEventTypes.AGENT_IDLE, { agentName: agent.name }, eventMeta)
    }
  }

  async pauseExecution(executionId: string): Promise<void> {
    const execution = await prisma.agentExecution.findUnique({
      where: { id: executionId },
    })
    if (!execution) throw new Error(`Execução ${executionId} não encontrada`)
    if (execution.status !== 'RUNNING') {
      throw new Error(`Só é possível pausar execuções em andamento (status atual: ${execution.status})`)
    }

    this.activeExecutions.delete(executionId)

    await prisma.agentExecution.update({
      where: { id: executionId },
      data: { status: 'PAUSED' },
    })

    await prisma.executionLog.create({
      data: {
        executionId,
        level: 'INFO',
        message: 'Execução pausada',
      },
    })

    agentEventEmitter.emit(
      AgentEventTypes.EXECUTION_PAUSED,
      {},
      { executionId, taskId: execution.taskId, agentId: execution.agentId }
    )
  }

  async resumeExecution(executionId: string): Promise<ExecutionResult> {
    const execution = await prisma.agentExecution.findUnique({
      where: { id: executionId },
      include: { task: true, agent: true },
    })
    if (!execution) throw new Error(`Execução ${executionId} não encontrada`)
    if (execution.status !== 'PAUSED') {
      throw new Error(`Só é possível retomar execuções pausadas (status atual: ${execution.status})`)
    }

    await prisma.agentExecution.update({
      where: { id: executionId },
      data: { status: 'RUNNING' },
    })

    this.activeExecutions.add(executionId)

    await prisma.executionLog.create({
      data: {
        executionId,
        level: 'INFO',
        message: 'Execução retomada',
      },
    })

    agentEventEmitter.emit(
      AgentEventTypes.EXECUTION_RESUMED,
      {},
      { executionId, taskId: execution.taskId, agentId: execution.agentId }
    )

    const context = this.buildContext(execution, execution.agent, execution.task)

    try {
      const capabilities = this.capabilities.get(execution.agent.role) ?? []
      let result: ExecutionResult

      if (capabilities.length > 0) {
        result = await this.runCapabilities(capabilities, execution.task, context)
      } else {
        result = await this.runClaudeExecution(execution.agent, execution.task, context)
      }

      const finalStatus = result.success ? 'COMPLETED' as const : 'FAILED' as const
      await prisma.agentExecution.update({
        where: { id: executionId },
        data: {
          status: finalStatus,
          completedAt: new Date(),
          result: result.result ?? null,
          error: result.error ?? null,
        },
      })

      if (result.success) {
        await prisma.task.update({
          where: { id: execution.taskId },
          data: { status: 'DONE' },
        }).catch(() => {})

        this.onExecutionCompleted(execution.task, result).catch(err =>
          console.error('[ExecutionEngine] onExecutionCompleted error:', err)
        )
      }

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      await prisma.agentExecution.update({
        where: { id: executionId },
        data: { status: 'FAILED', completedAt: new Date(), error: errorMessage },
      })
      return { success: false, error: errorMessage }
    } finally {
      this.activeExecutions.delete(executionId)
    }
  }

  async cancelExecution(executionId: string): Promise<void> {
    const execution = await prisma.agentExecution.findUnique({
      where: { id: executionId },
    })
    if (!execution) throw new Error(`Execução ${executionId} não encontrada`)
    if (execution.status === 'COMPLETED' || execution.status === 'CANCELLED') {
      throw new Error(`Execução já está ${execution.status}`)
    }

    this.activeExecutions.delete(executionId)

    await prisma.agentExecution.update({
      where: { id: executionId },
      data: {
        status: 'CANCELLED',
        completedAt: new Date(),
      },
    })

    await prisma.executionLog.create({
      data: {
        executionId,
        level: 'WARNING',
        message: 'Execução cancelada pelo usuário',
      },
    })

    agentEventEmitter.emit(
      AgentEventTypes.EXECUTION_CANCELLED,
      {},
      { executionId, taskId: execution.taskId, agentId: execution.agentId }
    )
  }

  // ============================================================================
  // ORCHESTRATION EXECUTION
  // ============================================================================

  /**
   * Busca todas as subtasks prontas de uma orquestração, adiciona na fila
   * e executa em paralelo respeitando o limite de concorrência configurável.
   * Tarefas desbloqueadas via cadeia de dependências continuam sendo processadas
   * automaticamente pelo DependencyManager após cada conclusão.
   */
  async executeOrchestration(
    orchestrationId: string,
    concurrencyLimit = this.concurrencyLimit
  ): Promise<void> {
    const readyTasks = await dependencyManager.getReadyTasks(orchestrationId)

    if (readyTasks.length === 0) {
      console.log(`[ExecutionEngine] Nenhuma task pronta para orquestração ${orchestrationId}`)
      return
    }

    const tasksWithAgents = readyTasks.filter(t => !!t.agentId)

    if (tasksWithAgents.length < readyTasks.length) {
      console.warn(
        `[ExecutionEngine] ${readyTasks.length - tasksWithAgents.length} task(s) sem agente atribuído — puladas`
      )
    }

    console.log(
      `[ExecutionEngine] Iniciando ${tasksWithAgents.length} task(s) da orquestração ` +
      `${orchestrationId} (limite: ${concurrencyLimit} paralelas)`
    )

    await this._runWithConcurrency(
      tasksWithAgents,
      concurrencyLimit,
      async (task) => {
        await this.executeTask(task.id, task.agentId!)
      }
    )
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Hook chamado após execução bem-sucedida.
   * Se a task pertence a uma orquestração:
   *   1. Chama DependencyManager.onTaskCompleted → desbloqueia próximas tasks
   *   2. Verifica se alguma fase foi completada → dispara review do SENTINEL
   */
  private async onExecutionCompleted(task: Task, result: ExecutionResult): Promise<void> {
    if (!result.success) return
    if (task.title.startsWith('[REVIEW]')) return // Evita loop em review tasks
    if (!task.orchestrationId) return

    await dependencyManager.onTaskCompleted(task.id)
    await this.checkPhaseCompletion(task.id, task.orchestrationId)
  }

  /**
   * Verifica se todas as subtarefas de uma fase do plano estão concluídas.
   * Quando completa, dispara o review automático do SENTINEL para a fase.
   */
  private async checkPhaseCompletion(
    completedTaskId: string,
    orchestrationId: string
  ): Promise<void> {
    const orchestration = await prisma.orchestration.findUnique({
      where: { id: orchestrationId },
      select: { plan: true, status: true },
    })

    if (!orchestration?.plan || orchestration.status === 'COMPLETED') return

    const plan = orchestration.plan as unknown as OrchestrationPlan
    if (!plan.phases || !Array.isArray(plan.phases)) return

    for (const phase of plan.phases) {
      const phaseTitles = phase.subtasks.map(s => s.title)

      const phaseTasks = await prisma.task.findMany({
        where: { orchestrationId, title: { in: phaseTitles } },
        select: { id: true, title: true, status: true },
      })

      const isInPhase = phaseTasks.some(t => t.id === completedTaskId)
      if (!isInPhase) continue

      const allDone = phaseTasks.length > 0 && phaseTasks.every(t => t.status === 'DONE')
      if (!allDone) return // Fase ainda não completamente concluída

      await this.triggerPhaseReview(orchestrationId, phase, phaseTasks)
      break
    }
  }

  /**
   * Cria a task de review para a fase e inicia o SENTINEL em background.
   * Garante idempotência: não cria review duplicado para a mesma fase.
   */
  private async triggerPhaseReview(
    orchestrationId: string,
    phase: Phase,
    completedTasks: { id: string; title: string; status: string }[]
  ): Promise<void> {
    const sentinel = await prisma.agent.findFirst({
      where: { role: 'SENTINEL', isActive: true },
    })

    if (!sentinel) {
      console.warn('[ExecutionEngine] Nenhum agente SENTINEL disponível para review de fase')
      return
    }

    const reviewTitle = `[REVIEW] ${phase.name}`

    // Idempotência: evita revisões duplicadas para a mesma fase
    const existing = await prisma.task.findFirst({
      where: { orchestrationId, title: reviewTitle },
    })
    if (existing) return

    const taskList = completedTasks.map(t => `- ${t.title}`).join('\n')
    const reviewTask = await prisma.task.create({
      data: {
        title: reviewTitle,
        description:
          `Review automático da fase "${phase.name}".\n\n` +
          `Tarefas concluídas nesta fase:\n${taskList}`,
        status: 'TODO',
        priority: 'HIGH',
        orchestrationId,
        agentId: sentinel.id,
        agentName: sentinel.name,
        autoCreated: true,
      },
    })

    console.log(`[ExecutionEngine] Review da fase "${phase.name}" iniciado (task: ${reviewTask.id})`)

    // Executa em background para não bloquear o fluxo principal
    this.executePhaseReview(reviewTask, orchestrationId, completedTasks).catch(err =>
      console.error('[ExecutionEngine] Erro no review de fase:', err)
    )
  }

  /**
   * Executa o review de fase com o SENTINEL via Claude AI.
   * APROVADO → emite EXECUTION_COMPLETED e loga sucesso
   * REPROVADO → move tasks para status REVIEW (aguardando correção) e atualiza orquestração
   */
  private async executePhaseReview(
    reviewTask: Task,
    orchestrationId: string,
    completedTasks: { id: string; title: string }[]
  ): Promise<void> {
    const sentinel = await prisma.agent.findFirst({
      where: { role: 'SENTINEL', isActive: true },
    })
    if (!sentinel) return

    await prisma.task.update({
      where: { id: reviewTask.id },
      data: { status: 'IN_PROGRESS' },
    }).catch(() => {})

    const systemPrompt = ROLE_SYSTEM_PROMPTS['SENTINEL']
    const phaseName = reviewTask.title.replace('[REVIEW] ', '')
    const prompt = `Você está realizando o review de qualidade da fase "${phaseName}" de uma orquestração de desenvolvimento.

Tarefas concluídas nesta fase:
${completedTasks.map(t => `- ${t.title}`).join('\n')}

Avalie se as tarefas foram concluídas adequadamente e se a qualidade é aceitável para prosseguir para a próxima fase.

Responda com uma das seguintes decisões na primeira linha:
- APROVADO: se a fase passou no review e a próxima fase pode iniciar
- REPROVADO: se foram encontrados problemas que precisam de correção

Seguido de um feedback detalhado justificando sua decisão.`

    try {
      const response = await createClaudeMessage(prompt, systemPrompt)
      const approved = response.toUpperCase().trimStart().startsWith('APROVADO')

      // Salva o resultado do review como comentário na task
      await prisma.comment.create({
        data: {
          taskId: reviewTask.id,
          content: response,
          authorName: sentinel.name,
          authorType: 'AGENT',
        },
      }).catch(() => {})

      // Marca a review task como concluída
      await prisma.task.update({
        where: { id: reviewTask.id },
        data: { status: 'DONE' },
      }).catch(() => {})

      if (approved) {
        console.log(`[ExecutionEngine] ✅ Review APROVADO para fase "${phaseName}"`)
        agentEventEmitter.emit(
          AgentEventTypes.EXECUTION_COMPLETED,
          { result: `Fase "${phaseName}" aprovada no review` },
          { taskId: reviewTask.id }
        )
      } else {
        console.warn(`[ExecutionEngine] ❌ Review REPROVADO para fase "${phaseName}"`)

        // Retorna tasks da fase para REVIEW (aguardando correção)
        await prisma.task.updateMany({
          where: { id: { in: completedTasks.map(t => t.id) } },
          data: { status: 'REVIEW' },
        })

        await prisma.orchestration.update({
          where: { id: orchestrationId },
          data: {
            status: 'REVIEWING',
            currentPhase: `Review reprovado — "${phaseName}" aguarda correções`,
          },
        }).catch(() => {})

        agentEventEmitter.emit(
          AgentEventTypes.EXECUTION_FAILED,
          { error: `Review reprovado para fase "${phaseName}": ${response.substring(0, 200)}` },
          { taskId: reviewTask.id }
        )
      }
    } catch (err) {
      console.error(`[ExecutionEngine] Erro ao executar review da fase "${phaseName}":`, err)

      await prisma.task.update({
        where: { id: reviewTask.id },
        data: { status: 'DONE' },
      }).catch(() => {})
    }
  }

  /**
   * Executa uma lista de itens em paralelo com limite de concorrência.
   * Modelo de workers: cada worker consome items da fila até esgotá-la,
   * garantindo throughput constante com no máximo `limit` execuções simultâneas.
   */
  private async _runWithConcurrency<T>(
    items: T[],
    limit: number,
    fn: (item: T) => Promise<void>
  ): Promise<void> {
    const queue = [...items]
    const workers = Array.from(
      { length: Math.min(limit, items.length) },
      async () => {
        while (queue.length > 0) {
          const item = queue.shift()
          if (item !== undefined) {
            await fn(item)
          }
        }
      }
    )
    await Promise.all(workers)
  }

  private buildContext(
    execution: AgentExecution,
    agent: Agent,
    task: Task
  ): ExecutionContext {
    return {
      execution,
      agent,
      task,
      log: async (level: LogLevel, message: string, data?: unknown) => {
        await prisma.executionLog.create({
          data: {
            executionId: execution.id,
            level,
            message,
            data: data ? JSON.parse(JSON.stringify(data)) : undefined,
          },
        })
      },
      updateProgress: async (progress: number) => {
        const clamped = Math.max(0, Math.min(100, progress))
        await prisma.agentExecution.update({
          where: { id: execution.id },
          data: { progress: clamped },
        })
        agentEventEmitter.emit(
          AgentEventTypes.EXECUTION_PROGRESS,
          { progress: clamped },
          { executionId: execution.id, taskId: task.id, agentId: agent.id }
        )
      },
      requestHumanReview: async (reason: string) => {
        await prisma.executionLog.create({
          data: {
            executionId: execution.id,
            level: 'WARNING',
            message: `Revisão humana solicitada: ${reason}`,
            data: { type: 'HUMAN_REVIEW_REQUEST', reason },
          },
        })
        await prisma.agentExecution.update({
          where: { id: execution.id },
          data: { status: 'PAUSED' },
        })
      },
    }
  }

  private async runCapabilities(
    capabilities: AgentCapability[],
    task: Task,
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    const allArtifacts: string[] = []
    const results: string[] = []
    const progressStep = 80 / capabilities.length

    for (let i = 0; i < capabilities.length; i++) {
      const cap = capabilities[i]

      if (!this.activeExecutions.has(context.execution.id)) {
        return { success: false, error: 'Execução cancelada durante processamento' }
      }

      await context.log('INFO', `Executando capacidade: ${cap.name}`)
      const result = await cap.execute(task, context)

      if (!result.success) {
        return result
      }

      if (result.result) results.push(result.result)
      if (result.artifacts) allArtifacts.push(...result.artifacts)

      await context.updateProgress(10 + Math.round(progressStep * (i + 1)))
    }

    return {
      success: true,
      result: results.join('\n\n---\n\n'),
      artifacts: allArtifacts.length > 0 ? allArtifacts : undefined,
    }
  }

  private async runClaudeExecution(
    agent: Agent,
    task: Task,
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    await context.updateProgress(20)

    const systemPrompt = ROLE_SYSTEM_PROMPTS[agent.role]
    let prompt = `Tarefa: ${task.title}\n\nDescrição: ${task.description || 'Sem descrição'}\n\nPrioridade: ${task.priority}\nStatus atual: ${task.status}\n\nAnalise esta tarefa e forneça um plano detalhado de ação.`

    // Enriquecer com contexto de aprendizado do agente (import dinâmico)
    try {
      const { generateImprovementPrompt } = await import('@/lib/agents/learning')
      const improvementContext = await generateImprovementPrompt(agent.id)
      if (improvementContext) {
        prompt += improvementContext
        await context.log('INFO', 'Contexto de aprendizado incluído no prompt')
      }
    } catch {
      // Não bloqueia execução se falhar ao buscar contexto de aprendizado
      await context.log('DEBUG', 'Sem contexto de aprendizado disponível')
    }

    await context.log('DEBUG', 'Enviando prompt para Claude AI', {
      model: agent.role,
      taskTitle: task.title,
    })

    await context.updateProgress(40)

    try {
      const response = await createClaudeMessage(prompt, systemPrompt)

      await context.updateProgress(80)
      await context.log('INFO', 'Resposta recebida da Claude AI')

      return {
        success: true,
        result: response,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      await context.log('ERROR', `Erro na chamada Claude AI: ${errorMessage}`)
      return { success: false, error: errorMessage }
    }
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

export const executionEngine = new ExecutionEngine()
export { ExecutionEngine }
