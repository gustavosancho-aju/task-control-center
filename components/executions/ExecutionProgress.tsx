'use client'

import { useState, useEffect, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import {
  Pause,
  Play,
  X,
  Clock,
  Loader2,
  CheckCircle2,
  XCircle,
  Ban,
  Hourglass,
} from 'lucide-react'

type ExecutionStatus = 'QUEUED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'CANCELLED'

interface AgentExecution {
  id: string
  taskId: string
  agentId: string
  status: ExecutionStatus
  startedAt: string | null
  completedAt: string | null
  progress: number
  result?: string | null
  error?: string | null
}

interface ExecutionProgressProps {
  execution: AgentExecution
  onPause?: () => void
  onResume?: () => void
  onCancel?: () => void
}

const STATUS_CONFIG: Record<ExecutionStatus, {
  label: string
  badge: string
  bar: string
  icon: React.ElementType
  animate: boolean
}> = {
  QUEUED: {
    label: 'Aguardando...',
    badge: 'bg-muted text-foreground border-border',
    bar: 'bg-muted-foreground',
    icon: Hourglass,
    animate: false,
  },
  RUNNING: {
    label: 'Executando',
    badge: 'bg-blue-100 text-blue-700 border-blue-300',
    bar: 'bg-blue-500',
    icon: Loader2,
    animate: true,
  },
  PAUSED: {
    label: 'Pausado',
    badge: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    bar: 'bg-yellow-500',
    icon: Pause,
    animate: false,
  },
  COMPLETED: {
    label: 'Concluído',
    badge: 'bg-green-100 text-green-700 border-green-300',
    bar: 'bg-green-500',
    icon: CheckCircle2,
    animate: false,
  },
  FAILED: {
    label: 'Falhou',
    badge: 'bg-red-100 text-red-700 border-red-300',
    bar: 'bg-red-500',
    icon: XCircle,
    animate: false,
  },
  CANCELLED: {
    label: 'Cancelado',
    badge: 'bg-muted text-muted-foreground border-border',
    bar: 'bg-muted-foreground',
    icon: Ban,
    animate: false,
  },
}

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60

  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`
  if (m > 0) return `${m}m ${s.toString().padStart(2, '0')}s`
  return `${s}s`
}

export function ExecutionProgress({
  execution: initialExecution,
  onPause,
  onResume,
  onCancel,
}: ExecutionProgressProps) {
  const [execution, setExecution] = useState(initialExecution)
  const [now, setNow] = useState(Date.now())

  const isActive = execution.status === 'RUNNING' || execution.status === 'QUEUED'
  const config = STATUS_CONFIG[execution.status]
  const StatusIcon = config.icon

  // Polling while active
  const fetchExecution = useCallback(async () => {
    try {
      const res = await fetch(`/api/executions/${execution.id}`)
      if (!res.ok) return
      const data = await res.json()
      if (data.success) {
        setExecution({
          id: data.data.id,
          taskId: data.data.taskId,
          agentId: data.data.agentId,
          status: data.data.status,
          startedAt: data.data.startedAt,
          completedAt: data.data.completedAt,
          progress: data.data.progress,
          result: data.data.result,
          error: data.data.error,
        })
      }
    } catch {
      // silent
    }
  }, [execution.id])

  useEffect(() => {
    if (!isActive) return

    const interval = setInterval(() => {
      setNow(Date.now())
      fetchExecution()
    }, 1000)

    return () => clearInterval(interval)
  }, [isActive, fetchExecution])

  // Sync with parent prop changes
  useEffect(() => {
    setExecution(initialExecution)
  }, [initialExecution])

  // Time calculations
  const startMs = execution.startedAt ? new Date(execution.startedAt).getTime() : null
  const endMs = execution.completedAt ? new Date(execution.completedAt).getTime() : null

  const elapsedMs = startMs ? (endMs ?? now) - startMs : 0

  let estimatedRemainingMs: number | null = null
  if (startMs && execution.progress > 0 && execution.progress < 100 && isActive) {
    const elapsedSoFar = now - startMs
    const totalEstimated = (elapsedSoFar / execution.progress) * 100
    estimatedRemainingMs = totalEstimated - elapsedSoFar
  }

  const progress = Math.max(0, Math.min(100, execution.progress))

  return (
    <div className="bg-card rounded-xl border p-5 shadow-sm space-y-4">
      {/* Header: Status + Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <StatusIcon
            className={`h-5 w-5 ${
              config.animate ? 'animate-spin text-blue-500' : ''
            } ${!config.animate ? (
              execution.status === 'COMPLETED' ? 'text-green-500' :
              execution.status === 'FAILED' ? 'text-red-500' :
              execution.status === 'PAUSED' ? 'text-yellow-500' :
              'text-muted-foreground'
            ) : ''}`}
          />
          <Badge variant="outline" className={`border ${config.badge} text-xs font-medium`}>
            {config.label}
          </Badge>
        </div>

        <div className="flex items-center gap-1.5">
          {execution.status === 'RUNNING' && onPause && (
            <button
              onClick={onPause}
              className="flex items-center gap-1.5 text-xs font-medium text-yellow-600 hover:text-yellow-700 bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 rounded-lg px-3 py-1.5 transition-colors"
            >
              <Pause className="h-3.5 w-3.5" />
              Pausar
            </button>
          )}
          {execution.status === 'PAUSED' && onResume && (
            <button
              onClick={onResume}
              className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg px-3 py-1.5 transition-colors"
            >
              <Play className="h-3.5 w-3.5" />
              Retomar
            </button>
          )}
          {(execution.status === 'RUNNING' || execution.status === 'PAUSED' || execution.status === 'QUEUED') && onCancel && (
            <button
              onClick={onCancel}
              className="flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg px-3 py-1.5 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              Cancelar
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Progresso</span>
          <span className="text-sm font-mono font-semibold text-foreground">{progress}%</span>
        </div>

        <div className="relative h-3 bg-muted rounded-full overflow-hidden">
          <div
            className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out ${config.bar}`}
            style={{ width: `${progress}%` }}
          />
          {execution.status === 'RUNNING' && progress < 100 && (
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-background/20 animate-pulse"
              style={{ width: `${progress}%` }}
            />
          )}
        </div>
      </div>

      {/* Time info */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        {startMs && (
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span>Decorrido: <span className="font-mono font-medium text-foreground">{formatElapsed(elapsedMs)}</span></span>
          </div>
        )}

        {estimatedRemainingMs !== null && estimatedRemainingMs > 0 && (
          <div className="flex items-center gap-1.5">
            <Hourglass className="h-3.5 w-3.5" />
            <span>Restante: <span className="font-mono font-medium text-foreground">~{formatElapsed(estimatedRemainingMs)}</span></span>
          </div>
        )}

        {!startMs && execution.status === 'QUEUED' && (
          <div className="flex items-center gap-1.5">
            <Hourglass className="h-3.5 w-3.5 animate-pulse" />
            <span>Aguardando início...</span>
          </div>
        )}
      </div>

      {/* Error message */}
      {execution.status === 'FAILED' && execution.error && (
        <div className="text-xs font-mono text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 break-all">
          {execution.error}
        </div>
      )}
    </div>
  )
}
