import prisma from '@/lib/db'
import { executionEngine } from '@/lib/agents/execution-engine'
import { registerAllCapabilities } from '@/lib/agents/capabilities'
import { agentEventEmitter, AgentEventTypes } from '@/lib/agents/event-emitter'

// ============================================================================
// TYPES
// ============================================================================

export interface ProcessorStatus {
  running: boolean
  interval: number
  lastCheck: Date | null
  nextCheck: Date | null
  processed: number
  errors: number
  lastError: string | null
}

// ============================================================================
// AUTO PROCESSOR
// ============================================================================

const DEFAULT_INTERVAL = parseInt(process.env.AUTO_PROCESS_INTERVAL ?? '30', 10)
const AUTO_ENABLED = process.env.AUTO_PROCESS_ENABLED !== 'false'

class AutoProcessor {
  private timer: ReturnType<typeof setInterval> | null = null
  private _running = false
  private _interval = DEFAULT_INTERVAL
  private _lastCheck: Date | null = null
  private _processed = 0
  private _errors = 0
  private _lastError: string | null = null
  private _processing = false
  private _capabilitiesRegistered = false

  private ensureCapabilities(): void {
    if (!this._capabilitiesRegistered) {
      registerAllCapabilities()
      this._capabilitiesRegistered = true
    }
  }

  /**
   * Inicia o loop de processamento automático.
   */
  start(): void {
    if (this._running) return

    this._running = true
    this.ensureCapabilities()

    console.log(`[AutoProcessor] Iniciado (intervalo: ${this._interval}s)`)

    // Processa imediatamente na primeira vez
    this.tick()

    this.timer = setInterval(() => this.tick(), this._interval * 1000)
  }

  /**
   * Para o processamento automático.
   */
  stop(): void {
    if (!this._running) return

    this._running = false

    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }

    console.log('[AutoProcessor] Parado')
  }

  /**
   * Processa a próxima tarefa pendente na fila.
   * Retorna true se processou algo, false se a fila estava vazia.
   */
  async processNext(): Promise<boolean> {
    const now = new Date()

    const entry = await prisma.agentQueue.findFirst({
      where: {
        status: 'PENDING',
        OR: [
          { scheduledFor: null },
          { scheduledFor: { lte: now } },
        ],
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' },
      ],
    })

    if (!entry) return false

    // Marca como PROCESSING
    await prisma.agentQueue.update({
      where: { id: entry.id },
      data: { status: 'PROCESSING', attempts: { increment: 1 } },
    })

    try {
      this.ensureCapabilities()

      const result = await executionEngine.executeTask(entry.taskId, entry.agentId)

      await prisma.agentQueue.update({
        where: { id: entry.id },
        data: { status: 'COMPLETED' },
      })

      agentEventEmitter.emit(
        AgentEventTypes.QUEUE_PROCESSED,
        { status: 'COMPLETED', result: result.success },
        { taskId: entry.taskId, agentId: entry.agentId }
      )

      this._processed++
      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this._errors++
      this._lastError = errorMessage

      // Verifica tentativas
      const updated = await prisma.agentQueue.findUnique({
        where: { id: entry.id },
      })

      const attempts = updated?.attempts ?? entry.attempts + 1
      const maxAttempts = updated?.maxAttempts ?? entry.maxAttempts
      const exhausted = attempts >= maxAttempts

      await prisma.agentQueue.update({
        where: { id: entry.id },
        data: { status: exhausted ? 'FAILED' : 'PENDING' },
      })

      console.error(
        `[AutoProcessor] Erro ao processar tarefa ${entry.taskId} (tentativa ${attempts}/${maxAttempts}):`,
        errorMessage
      )

      return true // Retorna true pois tentou processar (diferente de fila vazia)
    }
  }

  /**
   * Configura o intervalo de verificação em segundos.
   */
  setInterval(seconds: number): void {
    const clamped = Math.max(5, Math.min(3600, seconds))
    this._interval = clamped

    // Reinicia o timer se estiver rodando
    if (this._running && this.timer) {
      clearInterval(this.timer)
      this.timer = setInterval(() => this.tick(), this._interval * 1000)
    }

    console.log(`[AutoProcessor] Intervalo atualizado para ${clamped}s`)
  }

  /**
   * Retorna o status atual do processador.
   */
  getStatus(): ProcessorStatus {
    return {
      running: this._running,
      interval: this._interval,
      lastCheck: this._lastCheck,
      nextCheck: this._running && this._lastCheck
        ? new Date(this._lastCheck.getTime() + this._interval * 1000)
        : null,
      processed: this._processed,
      errors: this._errors,
      lastError: this._lastError,
    }
  }

  // --------------------------------------------------------------------------
  // PRIVATE
  // --------------------------------------------------------------------------

  private async tick(): Promise<void> {
    if (this._processing) return // Evita concorrência

    this._processing = true
    this._lastCheck = new Date()

    try {
      // Processa todas as tarefas pendentes na fila
      let hadWork = true
      while (hadWork && this._running) {
        hadWork = await this.processNext()
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this._errors++
      this._lastError = errorMessage
      console.error('[AutoProcessor] Erro no tick:', errorMessage)
    } finally {
      this._processing = false
    }
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

const globalForProcessor = globalThis as unknown as {
  autoProcessor: AutoProcessor | undefined
}

export const autoProcessor =
  globalForProcessor.autoProcessor ?? new AutoProcessor()

if (process.env.NODE_ENV !== 'production') {
  globalForProcessor.autoProcessor = autoProcessor
}

// Auto-start se configurado via env
if (AUTO_ENABLED && !autoProcessor.getStatus().running) {
  autoProcessor.start()
}

export { AutoProcessor }
