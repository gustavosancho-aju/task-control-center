// ============================================================================
// EVENT TYPES
// ============================================================================

export const AgentEventTypes = {
  EXECUTION_STARTED: 'execution.started',
  EXECUTION_PROGRESS: 'execution.progress',
  EXECUTION_COMPLETED: 'execution.completed',
  EXECUTION_FAILED: 'execution.failed',
  EXECUTION_PAUSED: 'execution.paused',
  EXECUTION_RESUMED: 'execution.resumed',
  EXECUTION_CANCELLED: 'execution.cancelled',
  QUEUE_ADDED: 'queue.added',
  QUEUE_PROCESSED: 'queue.processed',
  AGENT_IDLE: 'agent.idle',
  AGENT_BUSY: 'agent.busy',
} as const

export type AgentEventType = (typeof AgentEventTypes)[keyof typeof AgentEventTypes]

// ============================================================================
// EVENT PAYLOAD
// ============================================================================

export interface EventPayload {
  type: AgentEventType
  timestamp: Date
  data: unknown
  executionId?: string
  taskId?: string
  agentId?: string
}

// ============================================================================
// EVENT CALLBACK
// ============================================================================

type EventCallback = (payload: EventPayload) => void

// ============================================================================
// AGENT EVENT EMITTER (SINGLETON)
// ============================================================================

const DEFAULT_HISTORY_LIMIT = 100
const MAX_HISTORY_SIZE = 1000

class AgentEventEmitter {
  private listeners = new Map<AgentEventType, Set<EventCallback>>()
  private wildcardListeners = new Set<EventCallback>()
  private history: EventPayload[] = []

  /**
   * Registra um listener para um tipo de evento específico.
   * Use '*' como evento para ouvir todos os eventos.
   */
  on(event: AgentEventType | '*', callback: EventCallback): void {
    if (event === '*') {
      this.wildcardListeners.add(callback)
      return
    }
    const existing = this.listeners.get(event)
    if (existing) {
      existing.add(callback)
    } else {
      this.listeners.set(event, new Set([callback]))
    }
  }

  /**
   * Remove um listener registrado.
   */
  off(event: AgentEventType | '*', callback: EventCallback): void {
    if (event === '*') {
      this.wildcardListeners.delete(callback)
      return
    }
    this.listeners.get(event)?.delete(callback)
  }

  /**
   * Dispara um evento, notificando todos os listeners registrados.
   */
  emit(
    event: AgentEventType,
    data: unknown = {},
    meta: { executionId?: string; taskId?: string; agentId?: string } = {}
  ): void {
    const payload: EventPayload = {
      type: event,
      timestamp: new Date(),
      data,
      ...meta,
    }

    // Armazena no histórico
    this.history.push(payload)
    if (this.history.length > MAX_HISTORY_SIZE) {
      this.history = this.history.slice(-MAX_HISTORY_SIZE)
    }

    // Notifica listeners específicos
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      for (const cb of callbacks) {
        try {
          cb(payload)
        } catch (err) {
          console.error(`[EventEmitter] Erro no listener de ${event}:`, err)
        }
      }
    }

    // Notifica listeners wildcard
    for (const cb of this.wildcardListeners) {
      try {
        cb(payload)
      } catch (err) {
        console.error(`[EventEmitter] Erro no listener wildcard:`, err)
      }
    }
  }

  /**
   * Retorna os últimos eventos do histórico.
   */
  getHistory(limit: number = DEFAULT_HISTORY_LIMIT): EventPayload[] {
    return this.history.slice(-limit)
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

const globalForEmitter = globalThis as unknown as {
  agentEventEmitter: AgentEventEmitter | undefined
}

export const agentEventEmitter =
  globalForEmitter.agentEventEmitter ?? new AgentEventEmitter()

if (process.env.NODE_ENV !== 'production') {
  globalForEmitter.agentEventEmitter = agentEventEmitter
}

export { AgentEventEmitter }
