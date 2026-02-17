import prisma from '@/lib/db'
import { createClaudeMessage } from '@/lib/ai/claude-client'
import { agentEventEmitter, AgentEventTypes } from '@/lib/agents/event-emitter'
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

      agentEventEmitter.emit(
        result.success ? AgentEventTypes.EXECUTION_COMPLETED : AgentEventTypes.EXECUTION_FAILED,
        result.success ? { result: result.result } : { error: result.error },
        eventMeta
      )

      await context.log(
        result.success ? 'INFO' : 'ERROR',
        result.success ? 'Execução concluída com sucesso' : `Execução falhou: ${result.error}`
      )

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
  // PRIVATE METHODS
  // ============================================================================

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
