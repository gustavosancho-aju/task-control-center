// ============================================================================
// TYPES
// ============================================================================

export type NotifType =
  | 'success'
  | 'error'
  | 'warning'
  | 'info'
  | 'orchestration'
  | 'phase'
  | 'subtask'
  | 'review'

export interface StoredNotification {
  id: string
  type: NotifType
  title: string
  description?: string
  read: boolean
  createdAt: string   // ISO string
  href?: string       // rota para navegar ao clicar
  meta?: Record<string, unknown>
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STORAGE_KEY = 'tcc:notifications'
const MAX_NOTIFICATIONS = 50
const TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days
const CHANGE_EVENT = 'tcc:notifications:changed'

// ============================================================================
// STORE
// ============================================================================

class NotificationStore {
  private readonly listeners = new Set<() => void>()

  // --------------------------------------------------------------------------
  // Read
  // --------------------------------------------------------------------------

  getAll(): StoredNotification[] {
    if (typeof window === 'undefined') return []

    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return []

      const parsed = JSON.parse(raw) as StoredNotification[]
      const cutoff = Date.now() - TTL_MS

      // Filtra expiradas
      return parsed.filter(n => new Date(n.createdAt).getTime() > cutoff)
    } catch {
      return []
    }
  }

  getUnread(): StoredNotification[] {
    return this.getAll().filter(n => !n.read)
  }

  getUnreadCount(): number {
    return this.getUnread().length
  }

  // --------------------------------------------------------------------------
  // Write
  // --------------------------------------------------------------------------

  add(notification: Omit<StoredNotification, 'id' | 'read' | 'createdAt'>): StoredNotification {
    const newNotif: StoredNotification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      read: false,
      createdAt: new Date().toISOString(),
    }

    if (typeof window === 'undefined') return newNotif

    try {
      const current = this.getAll()
      // Mantém as mais recentes, dentro do limite
      const updated = [newNotif, ...current].slice(0, MAX_NOTIFICATIONS)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      this._dispatch()
    } catch {
      // localStorage pode estar cheio/indisponível
    }

    return newNotif
  }

  markRead(id: string): void {
    if (typeof window === 'undefined') return

    try {
      const updated = this.getAll().map(n =>
        n.id === id ? { ...n, read: true } : n
      )
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      this._dispatch()
    } catch {}
  }

  markAllRead(): void {
    if (typeof window === 'undefined') return

    try {
      const updated = this.getAll().map(n => ({ ...n, read: true }))
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      this._dispatch()
    } catch {}
  }

  clear(): void {
    if (typeof window === 'undefined') return

    try {
      localStorage.removeItem(STORAGE_KEY)
      this._dispatch()
    } catch {}
  }

  // --------------------------------------------------------------------------
  // Subscribe
  // --------------------------------------------------------------------------

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn)

    if (typeof window !== 'undefined') {
      window.addEventListener(CHANGE_EVENT, fn)
    }

    return () => this.unsubscribe(fn)
  }

  unsubscribe(fn: () => void): void {
    this.listeners.delete(fn)

    if (typeof window !== 'undefined') {
      window.removeEventListener(CHANGE_EVENT, fn)
    }
  }

  // --------------------------------------------------------------------------
  // Internal
  // --------------------------------------------------------------------------

  private _dispatch(): void {
    if (typeof window === 'undefined') return
    window.dispatchEvent(new Event(CHANGE_EVENT))
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

export const notificationStore = new NotificationStore()
export { NotificationStore }
