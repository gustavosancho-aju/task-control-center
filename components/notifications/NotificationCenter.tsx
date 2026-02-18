'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Network,
  GitBranch,
  ListTodo,
  AlertCircle,
  Star,
  Info,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { notificationStore, type StoredNotification, type NotifType } from '@/lib/notification-store'
import { cn } from '@/lib/utils'

// ============================================================================
// HELPERS
// ============================================================================

const TYPE_CONFIG: Record<NotifType, {
  icon: React.ElementType
  color: string
  bg: string
}> = {
  success:      { icon: Check,       color: 'text-green-500',   bg: 'bg-green-500/10' },
  error:        { icon: AlertCircle, color: 'text-red-500',     bg: 'bg-red-500/10' },
  warning:      { icon: AlertCircle, color: 'text-amber-500',   bg: 'bg-amber-500/10' },
  info:         { icon: Info,        color: 'text-blue-500',    bg: 'bg-blue-500/10' },
  orchestration:{ icon: Network,     color: 'text-purple-500',  bg: 'bg-purple-500/10' },
  phase:        { icon: GitBranch,   color: 'text-indigo-500',  bg: 'bg-indigo-500/10' },
  subtask:      { icon: ListTodo,    color: 'text-cyan-500',    bg: 'bg-cyan-500/10' },
  review:       { icon: Star,        color: 'text-amber-500',   bg: 'bg-amber-500/10' },
}

function timeAgo(isoStr: string): string {
  try {
    return formatDistanceToNow(new Date(isoStr), { addSuffix: true, locale: ptBR })
  } catch {
    return ''
  }
}

function fullDate(isoStr: string): string {
  try {
    return format(new Date(isoStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
  } catch {
    return ''
  }
}

// ============================================================================
// NOTIFICATION ITEM
// ============================================================================

interface NotifItemProps {
  notification: StoredNotification
  onRead: (id: string) => void
  onDismiss: (id: string) => void
}

function NotifItem({ notification: n, onRead, onDismiss }: NotifItemProps) {
  const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.info
  const Icon = cfg.icon

  const content = (
    <div
      className={cn(
        'flex gap-3 px-3 py-2.5 transition-colors hover:bg-accent/50 cursor-pointer group',
        !n.read && 'bg-accent/20'
      )}
      onClick={() => onRead(n.id)}
    >
      {/* Icon */}
      <div className={cn('flex-shrink-0 mt-0.5 h-7 w-7 rounded-full flex items-center justify-center', cfg.bg)}>
        <Icon className={cn('h-3.5 w-3.5', cfg.color)} />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn('text-sm leading-tight', !n.read && 'font-medium')}>
            {n.title}
          </p>
          {/* Dismiss button */}
          <button
            onClick={(e) => { e.stopPropagation(); onDismiss(n.id) }}
            className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
        {n.description && (
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug line-clamp-2">
            {n.description}
          </p>
        )}
        <p className="text-[10px] text-muted-foreground/60 mt-1" title={fullDate(n.createdAt)}>
          {timeAgo(n.createdAt)}
        </p>
      </div>

      {/* Unread dot */}
      {!n.read && (
        <div className="flex-shrink-0 mt-2 h-1.5 w-1.5 rounded-full bg-primary" />
      )}
    </div>
  )

  if (n.href) {
    return (
      <Link href={n.href} className="block">
        {content}
      </Link>
    )
  }

  return content
}

// ============================================================================
// NOTIFICATION CENTER
// ============================================================================

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<StoredNotification[]>([])
  const [open, setOpen] = useState(false)

  const refresh = useCallback(() => {
    setNotifications(notificationStore.getAll())
  }, [])

  // Sincroniza com o store
  useEffect(() => {
    refresh()
    const unsub = notificationStore.subscribe(refresh)
    return unsub
  }, [refresh])

  const unreadCount = notifications.filter(n => !n.read).length

  const handleRead = useCallback((id: string) => {
    notificationStore.markRead(id)
  }, [])

  const handleDismiss = useCallback((id: string) => {
    // Remove da lista (marca como lida + filtra da exibição via clear individual)
    // A forma mais simples: marcar como lida e remover do array local
    notificationStore.markRead(id)
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  const handleMarkAllRead = useCallback(() => {
    notificationStore.markAllRead()
  }, [])

  const handleClearAll = useCallback(() => {
    notificationStore.clear()
  }, [])

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="relative text-muted-foreground"
          aria-label={`Notificações${unreadCount > 0 ? ` (${unreadCount} não lidas)` : ''}`}
        >
          <Bell className={cn('h-4 w-4', unreadCount > 0 && 'text-foreground')} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-destructive text-primary-foreground text-[10px] font-bold leading-none">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-80 p-0 overflow-hidden"
        sideOffset={6}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">Notificações</h3>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0">
                {unreadCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={handleMarkAllRead}
                title="Marcar todas como lidas"
              >
                <CheckCheck className="h-3.5 w-3.5 mr-1" />
                Todas lidas
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                onClick={handleClearAll}
                title="Limpar todas"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="max-h-[420px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <Bell className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma notificação</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Atividades de tarefas e orquestrações aparecerão aqui
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {notifications.map((n) => (
                <NotifItem
                  key={n.id}
                  notification={n}
                  onRead={handleRead}
                  onDismiss={handleDismiss}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <>
            <Separator />
            <div className="px-3 py-2 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {notifications.length} notificação{notifications.length !== 1 ? 'ões' : ''}
              </p>
              <p className="text-xs text-muted-foreground/60">
                Últimos 7 dias
              </p>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
