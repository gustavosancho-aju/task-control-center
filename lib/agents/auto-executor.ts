import prisma from '@/lib/db'
import { executionEngine } from '@/lib/agents/execution-engine'
import { dependencyManager } from '@/lib/agents/dependency-manager'
import { agentEventEmitter, AgentEventTypes } from '@/lib/agents/event-emitter'
import type { EventPayload } from '@/lib/agents/event-emitter'

// ============================================================================
// TYPES
// ============================================================================

export interface AutoExecutorConfig {
  maxParallelExecutions: number
  retryAttempts: number
  executionTimeout: number
}

export interface LoopStats {
  orchestrationId: string
  started: number
  completed: number
  failed: number
  retried: number
  elapsedMs: number
}

export interface BatchResult {
  started: number
  skippedNoAgent: number
  skippedAtLimit: number
}

export interface CompletionResult {
  executionId: string
  status: 'COMPLETED' | 'FAILED' | 'CANCELLED'
}

// ============================================================================
// AUTO EXECUTOR
// ============================================================================

class AutoExecutor {
  readonly config: AutoExecutorConfig = {
    maxParallelExecutions: 2,
    retryAttempts: 3,
    executionTimeout: 5 * 60 * 1000, // 5 min
  }

  // taskId → número de tentativas consumidas
  private readonly retryMap = new Map<string, number>()

  // orchestrationIds com loop em andamento
  private readonly activeLoops = new Set<string>()

  // ============================================================================
  // a) startOrchestrationLoop
  // ============================================================================

  /**
   * Inicia o loop de execução automática para uma orquestração.
   * A cada iteração:
   *   1. Verifica o status da orquestração
   *   2. Busca e inicia tasks prontas (respeitando maxParallelExecutions)
   *   3. Aguarda pelo menos uma execução completar
   *   4. Processa o resultado (libera dependentes ou faz retry)
   *   5. Repete até a orquestração terminar (COMPLETED | FAILED)
   */
  async startOrchestrationLoop(orchestrationId: string): Promise<LoopStats> {
    if (this.activeLoops.has(orchestrationId)) {
      console.log(`[AutoExecutor] Loop já ativo para ${orchestrationId} — ignorado`)
      return this._emptyStats(orchestrationId)
    }

    this.activeLoops.add(orchestrationId)

    const stats: LoopStats = {
      orchestrationId,
      started: 0,
      completed: 0,
      failed: 0,
      retried: 0,
      elapsedMs: 0,
    }

    const startTime = Date.now()

    console.log(`[AutoExecutor] 🚀 Loop iniciado para orquestração ${orchestrationId}`)

    try {
      while (true) {
        // ── 1. Verifica status da orquestração ───────────────────────────────
        const orchestration = await prisma.orchestration.findUnique({
          where: { id: orchestrationId },
          select: { status: true },
        })

        if (!orchestration) {
          console.warn(`[AutoExecutor] Orquestração ${orchestrationId} não encontrada — encerrando`)
          break
        }

        if (orchestration.status === 'COMPLETED' || orchestration.status === 'FAILED') {
          console.log(`[AutoExecutor] Loop encerrado — status final: ${orchestration.status}`)
          break
        }

        // ── 2. Conta execuções em andamento ──────────────────────────────────
        const runningCount = await prisma.agentExecution.count({
          where: {
            task: { orchestrationId },
            status: { in: ['RUNNING', 'QUEUED'] },
          },
        })

        // ── 3. Inicia novo lote se houver slots disponíveis ──────────────────
        if (runningCount < this.config.maxParallelExecutions) {
          const batch = await this.executeNextBatch(orchestrationId)
          stats.started += batch.started

          if (batch.started === 0 && runningCount === 0) {
            // Sem tasks prontas e sem execuções em andamento
            const pendingCount = await prisma.task.count({
              where: {
                orchestrationId,
                status: { notIn: ['DONE'] },
              },
            })

            if (pendingCount === 0) {
              console.log(`[AutoExecutor] ✅ Todas as subtarefas concluídas`)
            } else {
              console.warn(
                `[AutoExecutor] ⚠️ ${pendingCount} tarefa(s) sem agente ou com dependências bloqueadas`
              )
            }
            break
          }
        }

        // ── 4. Aguarda uma execução completar ─────────────────────────────────
        // Pequena pausa para garantir que os registros de execução foram gravados
        await this._sleep(300)

        const runningExecutions = await prisma.agentExecution.findMany({
          where: {
            task: { orchestrationId },
            status: { in: ['RUNNING', 'QUEUED'] },
          },
          select: { id: true },
        })

        if (runningExecutions.length > 0) {
          const result = await this.waitForCompletion(runningExecutions.map(e => e.id))

          if (result) {
            const handled = await this.handleCompletion(result.executionId)
            if (handled.success) {
              stats.completed++
            } else if (handled.retried) {
              stats.retried++
            } else {
              stats.failed++
            }
          } else {
            // Timeout: verifica se a orquestração ainda pode continuar
            console.warn(`[AutoExecutor] Timeout aguardando execuções — verificando estado`)
          }
        } else {
          // Sem execuções em andamento: aguarda antes de verificar novamente
          await this._sleep(2000)
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error(`[AutoExecutor] Erro no loop de ${orchestrationId}:`, msg)
    } finally {
      this.activeLoops.delete(orchestrationId)
      stats.elapsedMs = Date.now() - startTime
    }

    console.log(`[AutoExecutor] 📊 Stats finais:`, stats)
    return stats
  }

  // ============================================================================
  // b) executeNextBatch
  // ============================================================================

  /**
   * Busca as próximas tasks prontas e as inicia em paralelo (fire-and-forget).
   * Respeita o limite de execuções paralelas: só inicia tasks que cabem nos slots livres.
   * Tasks sem agente atribuído são puladas com aviso.
   */
  async executeNextBatch(orchestrationId: string): Promise<BatchResult> {
    const result: BatchResult = { started: 0, skippedNoAgent: 0, skippedAtLimit: 0 }

    const readyTasks = await dependencyManager.getReadyTasks(orchestrationId)
    if (readyTasks.length === 0) return result

    // Calcula slots disponíveis
    const runningCount = await prisma.agentExecution.count({
      where: {
        task: { orchestrationId },
        status: { in: ['RUNNING', 'QUEUED'] },
      },
    })

    const slots = this.config.maxParallelExecutions - runningCount
    if (slots <= 0) {
      result.skippedAtLimit = readyTasks.length
      return result
    }

    // Separa tasks com agente atribuído
    const withAgent = readyTasks.filter(t => !!t.agentId)
    const withoutAgent = readyTasks.filter(t => !t.agentId)

    result.skippedNoAgent = withoutAgent.length

    if (withoutAgent.length > 0) {
      console.warn(
        `[AutoExecutor] ${withoutAgent.length} tarefa(s) sem agente — puladas: ` +
        withoutAgent.map(t => `"${t.title}"`).join(', ')
      )
    }

    const tasksToStart = withAgent.slice(0, slots)
    result.skippedAtLimit = Math.max(0, withAgent.length - slots)

    // Inicia execuções em paralelo (não aguarda — fire and forget)
    for (const task of tasksToStart) {
      console.log(`[AutoExecutor] ▶️  Iniciando "${task.title}" (agente: ${task.agentId})`)

      executionEngine.executeTask(task.id, task.agentId!).catch(err => {
        const errorMsg = err instanceof Error ? err.message : String(err)
        console.error(`[AutoExecutor] Erro ao executar "${task.title}":`, errorMsg)
        this.handleFailure(task.id, errorMsg).catch(e =>
          console.error('[AutoExecutor] handleFailure error:', e)
        )
      })

      result.started++
    }

    return result
  }

  // ============================================================================
  // c) waitForCompletion
  // ============================================================================

  /**
   * Aguarda pelo menos uma das execuções fornecidas completar.
   * Usa o event emitter para notificação em tempo real, com polling como fallback.
   * Retorna a primeira execução que completar, ou null em caso de timeout.
   */
  async waitForCompletion(executionIds: string[]): Promise<CompletionResult | null> {
    if (executionIds.length === 0) return null

    const idSet = new Set(executionIds)

    return new Promise<CompletionResult | null>((resolve) => {
      let settled = false

      const timeoutHandle = setTimeout(() => {
        if (!settled) {
          settled = true
          cleanup()
          console.warn(`[AutoExecutor] Timeout (${this.config.executionTimeout}ms) aguardando execuções`)
          resolve(null)
        }
      }, this.config.executionTimeout)

      // Polling fallback: verifica o banco a cada 3s caso o evento não chegue
      const pollHandle = setInterval(async () => {
        if (settled) return
        try {
          const found = await prisma.agentExecution.findFirst({
            where: {
              id: { in: executionIds },
              status: { in: ['COMPLETED', 'FAILED', 'CANCELLED'] },
            },
            orderBy: { completedAt: 'asc' },
            select: { id: true, status: true },
          })
          if (found && !settled) {
            settled = true
            cleanup()
            resolve({
              executionId: found.id,
              status: found.status as CompletionResult['status'],
            })
          }
        } catch {
          // Silencia erros de polling — próxima iteração tentará novamente
        }
      }, 3000)

      // Listener para evento de conclusão
      const onCompleted = (payload: EventPayload) => {
        if (settled) return
        const execId = payload.executionId
        if (execId && idSet.has(execId)) {
          settled = true
          cleanup()
          resolve({
            executionId: execId,
            status: 'COMPLETED',
          })
        }
      }

      // Listener para evento de falha
      const onFailed = (payload: EventPayload) => {
        if (settled) return
        const execId = payload.executionId
        if (execId && idSet.has(execId)) {
          settled = true
          cleanup()
          resolve({
            executionId: execId,
            status: 'FAILED',
          })
        }
      }

      const cleanup = () => {
        clearTimeout(timeoutHandle)
        clearInterval(pollHandle)
        agentEventEmitter.off(AgentEventTypes.EXECUTION_COMPLETED, onCompleted)
        agentEventEmitter.off(AgentEventTypes.EXECUTION_FAILED, onFailed)
        agentEventEmitter.off(AgentEventTypes.EXECUTION_CANCELLED, onFailed)
      }

      agentEventEmitter.on(AgentEventTypes.EXECUTION_COMPLETED, onCompleted)
      agentEventEmitter.on(AgentEventTypes.EXECUTION_FAILED, onFailed)
      agentEventEmitter.on(AgentEventTypes.EXECUTION_CANCELLED, onFailed)
    })
  }

  // ============================================================================
  // d) handleCompletion
  // ============================================================================

  /**
   * Processa o resultado de uma execução:
   * - COMPLETED: libera dependentes via DependencyManager e limpa tentativas de retry
   * - FAILED | CANCELLED: delega para handleFailure (retry ou falha definitiva)
   */
  async handleCompletion(
    executionId: string
  ): Promise<{ success: boolean; retried?: boolean }> {
    const execution = await prisma.agentExecution.findUnique({
      where: { id: executionId },
      select: {
        id: true,
        status: true,
        error: true,
        taskId: true,
        task: {
          select: {
            id: true,
            title: true,
            orchestrationId: true,
          },
        },
      },
    })

    if (!execution) {
      console.warn(`[AutoExecutor] handleCompletion: execução ${executionId} não encontrada`)
      return { success: false }
    }

    const taskTitle = execution.task.title

    if (execution.status === 'COMPLETED') {
      console.log(`[AutoExecutor] ✅ "${taskTitle}" concluída com sucesso`)

      // Limpa contador de retry para esta tarefa
      this.retryMap.delete(execution.taskId)

      // Libera dependentes (caso ExecutionEngine não tenha feito — dupla garantia)
      if (execution.task.orchestrationId) {
        await dependencyManager.onTaskCompleted(execution.taskId).catch(err =>
          console.error('[AutoExecutor] onTaskCompleted error:', err)
        )
      }

      return { success: true }
    }

    // FAILED ou CANCELLED
    const error = execution.error ?? 'Execução falhou sem mensagem de erro'
    console.warn(`[AutoExecutor] ❌ "${taskTitle}" falhou: ${error}`)

    const retried = await this.handleFailure(execution.taskId, error)
    return { success: false, retried }
  }

  // ============================================================================
  // e) handleFailure
  // ============================================================================

  /**
   * Lida com falha de uma tarefa:
   * - Se ainda há tentativas: reseta task para TODO (o loop a recolherá na próxima iteração)
   * - Se esgotou tentativas: bloqueia a tarefa e marca a orquestração como FAILED
   *
   * Retorna true se foi agendado retry, false se falha definitiva.
   */
  async handleFailure(taskId: string, error: string): Promise<boolean> {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        title: true,
        orchestrationId: true,
        agentId: true,
        priority: true,
      },
    })

    if (!task) {
      console.warn(`[AutoExecutor] handleFailure: tarefa ${taskId} não encontrada`)
      return false
    }

    const retryCount = this.retryMap.get(taskId) ?? 0

    if (retryCount < this.config.retryAttempts) {
      const nextAttempt = retryCount + 1
      this.retryMap.set(taskId, nextAttempt)

      console.log(
        `[AutoExecutor] 🔄 Retry ${nextAttempt}/${this.config.retryAttempts} para "${task.title}"`
      )

      // Reseta task para TODO — o loop a recolherá via getReadyTasks
      await prisma.task.update({
        where: { id: taskId },
        data: { status: 'TODO' },
      }).catch(err =>
        console.error(`[AutoExecutor] Erro ao resetar status de ${taskId}:`, err)
      )

      agentEventEmitter.emit(
        AgentEventTypes.QUEUE_ADDED,
        { taskId, attempt: nextAttempt, maxAttempts: this.config.retryAttempts, error },
        { taskId }
      )

      return true // Retry agendado
    }

    // ── Esgotou todas as tentativas ───────────────────────────────────────────
    this.retryMap.delete(taskId)

    console.error(
      `[AutoExecutor] 💀 "${task.title}" falhou definitivamente após ` +
      `${this.config.retryAttempts} tentativa(s): ${error}`
    )

    // Marca tarefa como BLOCKED
    await prisma.task.update({
      where: { id: taskId },
      data: { status: 'BLOCKED' },
    }).catch(err =>
      console.error(`[AutoExecutor] Erro ao marcar tarefa ${taskId} como BLOCKED:`, err)
    )

    // Marca orquestração como FAILED
    if (task.orchestrationId) {
      await prisma.orchestration.update({
        where: { id: task.orchestrationId },
        data: {
          status: 'FAILED',
          currentPhase: `Falha definitiva em "${task.title}" após ${this.config.retryAttempts} tentativa(s)`,
        },
      }).catch(err =>
        console.error(`[AutoExecutor] Erro ao marcar orquestração ${task.orchestrationId} como FAILED:`, err)
      )

      agentEventEmitter.emit(
        AgentEventTypes.EXECUTION_FAILED,
        {
          orchestrationId: task.orchestrationId,
          taskId,
          taskTitle: task.title,
          error,
          retriesExhausted: true,
        },
        { taskId }
      )

      console.error(
        `[AutoExecutor] Orquestração ${task.orchestrationId} marcada como FAILED`
      )
    }

    return false // Falha definitiva
  }

  // ============================================================================
  // CONFIGURATION & STATUS
  // ============================================================================

  configure(overrides: Partial<AutoExecutorConfig>): void {
    const validated: AutoExecutorConfig = {
      maxParallelExecutions: Math.max(1, Math.min(10,
        overrides.maxParallelExecutions ?? this.config.maxParallelExecutions
      )),
      retryAttempts: Math.max(0, Math.min(10,
        overrides.retryAttempts ?? this.config.retryAttempts
      )),
      executionTimeout: Math.max(30_000, Math.min(30 * 60_000,
        overrides.executionTimeout ?? this.config.executionTimeout
      )),
    }
    Object.assign(this.config, validated)
    console.log('[AutoExecutor] Configuração atualizada:', this.config)
  }

  getConfig(): Readonly<AutoExecutorConfig> {
    return { ...this.config }
  }

  isLoopActive(orchestrationId: string): boolean {
    return this.activeLoops.has(orchestrationId)
  }

  getActiveLoops(): string[] {
    return [...this.activeLoops]
  }

  getRetryCount(taskId: string): number {
    return this.retryMap.get(taskId) ?? 0
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private _sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private _emptyStats(orchestrationId: string): LoopStats {
    return {
      orchestrationId,
      started: 0,
      completed: 0,
      failed: 0,
      retried: 0,
      elapsedMs: 0,
    }
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

const globalForExecutor = globalThis as unknown as {
  autoExecutor: AutoExecutor | undefined
}

export const autoExecutor =
  globalForExecutor.autoExecutor ?? new AutoExecutor()

if (process.env.NODE_ENV !== 'production') {
  globalForExecutor.autoExecutor = autoExecutor
}

export { AutoExecutor }
