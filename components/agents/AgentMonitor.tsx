'use client'

import { useState, useEffect, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { ExecutionProgress } from '@/components/executions/ExecutionProgress'
import { ExecutionLogs } from '@/components/executions/ExecutionLogs'
import {
  Play,
  Pause,
  Loader2,
  ListTodo,
  BarChart3,
  Clock,
  CheckCircle2,
  TrendingUp,
  CircleDot,
  AlertCircle,
} from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

type AgentRole = 'MAESTRO' | 'SENTINEL' | 'ARCHITECTON' | 'PIXEL'

interface Agent {
  id: string
  name: string
  role: AgentRole
  description: string | null
  skills: string[]
  isActive: boolean
  tasksCompleted: number
  successRate: number
}

interface Execution {
  id: string
  taskId: string
  agentId: string
  status: 'QUEUED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  startedAt: string | null
  completedAt: string | null
  progress: number
  result?: string | null
  error?: string | null
  task?: { id: string; title: string; status: string; priority: string }
}

interface QueueItem {
  id: string
  taskId: string
  agentId: string
  priority: number
  status: string
  createdAt: string
}

interface AgentMonitorProps {
  agentId: string
}

const ROLE_CONFIG: Record<AgentRole, { icon: string; color: string; bg: string; border: string }> = {
  MAESTRO: { icon: '🎯', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
  SENTINEL: { icon: '🛡️', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' },
  ARCHITECTON: { icon: '🏗️', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  PIXEL: { icon: '🎨', color: 'text-pink-700', bg: 'bg-pink-50', border: 'border-pink-200' },
}

// ============================================================================
// Helpers
// ============================================================================

function formatDuration(ms: number): string {
  const sec = Math.floor(ms / 1000)
  const m = Math.floor(sec / 60)
  const s = sec % 60
  if (m > 0) return `${m}m ${s.toString().padStart(2, '0')}s`
  return `${s}s`
}

// ============================================================================
// Component
// ============================================================================

export function AgentMonitor({ agentId }: AgentMonitorProps) {
  const [agent, setAgent] = useState<Agent | null>(null)
  const [activeExecution, setActiveExecution] = useState<Execution | null>(null)
  const [queueItems, setQueueItems] = useState<QueueItem[]>([])
  const [queuePending, setQueuePending] = useState(0)
  const [todayCompleted, setTodayCompleted] = useState(0)
  const [avgDuration, setAvgDuration] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // --------------------------------------------------------------------------
  // Data fetching
  // --------------------------------------------------------------------------

  const fetchAgent = useCallback(async () => {
    try {
      const res = await fetch(`/api/agents?active=false`)
      if (!res.ok) return
      const data = await res.json()
      if (data.success) {
        const found = data.data.find((a: Agent & { id: string }) => a.id === agentId)
        if (found) setAgent(found)
      }
    } catch { /* silent */ }
  }, [agentId])

  const fetchActiveExecution = useCallback(async () => {
    try {
      const res = await fetch(`/api/executions?agentId=${agentId}&status=RUNNING&limit=1`)
      if (!res.ok) return
      const data = await res.json()
      if (data.success) {
        if (data.data.length > 0) {
          setActiveExecution(data.data[0])
        } else {
          // Check for PAUSED
          const pausedRes = await fetch(`/api/executions?agentId=${agentId}&status=PAUSED&limit=1`)
          if (pausedRes.ok) {
            const pausedData = await pausedRes.json()
            setActiveExecution(pausedData.success && pausedData.data.length > 0 ? pausedData.data[0] : null)
          }
        }
      }
    } catch { /* silent */ }
  }, [agentId])

  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch('/api/queue')
      if (!res.ok) return
      const data = await res.json()
      if (data.success) {
        const agentItems = data.data.items.filter(
          (item: QueueItem) => item.agentId === agentId && item.status === 'PENDING'
        )
        setQueueItems(agentItems.slice(0, 3))
        setQueuePending(agentItems.length)
      }
    } catch { /* silent */ }
  }, [agentId])

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`/api/executions?agentId=${agentId}&status=COMPLETED&limit=50`)
      if (!res.ok) return
      const data = await res.json()
      if (!data.success) return

      const executions: Execution[] = data.data
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const completedToday = executions.filter(
        (e) => e.completedAt && new Date(e.completedAt) >= todayStart
      )
      setTodayCompleted(completedToday.length)

      const durations = executions
        .filter((e) => e.startedAt && e.completedAt)
        .map((e) => new Date(e.completedAt!).getTime() - new Date(e.startedAt!).getTime())

      if (durations.length > 0) {
        setAvgDuration(durations.reduce((a, b) => a + b, 0) / durations.length)
      }
    } catch { /* silent */ }
  }, [agentId])

  const fetchAll = useCallback(async () => {
    await Promise.all([fetchAgent(), fetchActiveExecution(), fetchQueue(), fetchStats()])
    setLoading(false)
  }, [fetchAgent, fetchActiveExecution, fetchQueue, fetchStats])

  // --------------------------------------------------------------------------
  // Initial load + polling
  // --------------------------------------------------------------------------

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  useEffect(() => {
    const interval = setInterval(fetchAll, 3000)
    return () => clearInterval(interval)
  }, [fetchAll])

  // --------------------------------------------------------------------------
  // Actions
  // --------------------------------------------------------------------------

  const handleExecuteNext = async () => {
    setActionLoading('execute')
    try {
      const res = await fetch(`/api/agents/${agentId}/execute`, { method: 'POST' })
      if (res.ok) await fetchAll()
    } catch { /* silent */ }
    setActionLoading(null)
  }

  const handlePause = async () => {
    if (!activeExecution) return
    setActionLoading('pause')
    try {
      await fetch(`/api/executions/${activeExecution.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pause' }),
      })
      await fetchAll()
    } catch { /* silent */ }
    setActionLoading(null)
  }

  const handleResume = async () => {
    if (!activeExecution) return
    setActionLoading('resume')
    try {
      await fetch(`/api/executions/${activeExecution.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resume' }),
      })
      await fetchAll()
    } catch { /* silent */ }
    setActionLoading(null)
  }

  const handleCancel = async () => {
    if (!activeExecution) return
    setActionLoading('cancel')
    try {
      await fetch(`/api/executions/${activeExecution.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      })
      await fetchAll()
    } catch { /* silent */ }
    setActionLoading(null)
  }

  // --------------------------------------------------------------------------
  // Loading state
  // --------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="bg-card rounded-xl border p-6 shadow-sm flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Carregando agente...</span>
        </div>
      </div>
    )
  }

  if (!agent) {
    return (
      <div className="bg-card rounded-xl border p-6 shadow-sm flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-red-500">
          <AlertCircle className="h-5 w-5" />
          <span className="text-sm">Agente não encontrado</span>
        </div>
      </div>
    )
  }

  const roleConfig = ROLE_CONFIG[agent.role]

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  return (
    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
      {/* ================================================================== */}
      {/* Header */}
      {/* ================================================================== */}
      <div className={`px-5 py-4 ${roleConfig.bg} border-b ${roleConfig.border}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{roleConfig.icon}</span>
            <div>
              <h3 className={`font-semibold text-lg ${roleConfig.color}`}>{agent.name}</h3>
              <p className="text-xs text-muted-foreground">{agent.description || agent.role}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={`text-xs ${agent.isActive
                ? 'bg-green-50 text-green-700 border-green-300'
                : 'bg-muted text-muted-foreground border-border'
              }`}
            >
              <CircleDot className="h-3 w-3 mr-1" />
              {agent.isActive ? 'Ativo' : 'Inativo'}
            </Badge>

            {activeExecution?.status === 'RUNNING' && (
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-300">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Executando
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* ================================================================ */}
        {/* Execução Atual */}
        {/* ================================================================ */}
        <section>
          <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Play className="h-4 w-4" />
            Execução Atual
          </h4>

          {activeExecution ? (
            <div className="space-y-3">
              {activeExecution.task && (
                <div className="text-sm text-muted-foreground bg-muted rounded-lg px-3 py-2 border">
                  <span className="text-muted-foreground text-xs">Tarefa:</span>{' '}
                  <span className="font-medium">{activeExecution.task.title}</span>
                </div>
              )}

              <ExecutionProgress
                execution={activeExecution}
                onPause={activeExecution.status === 'RUNNING' ? handlePause : undefined}
                onResume={activeExecution.status === 'PAUSED' ? handleResume : undefined}
                onCancel={
                  ['RUNNING', 'PAUSED', 'QUEUED'].includes(activeExecution.status)
                    ? handleCancel
                    : undefined
                }
              />

              <div className="max-h-[250px]">
                <ExecutionLogs executionId={activeExecution.id} />
              </div>
            </div>
          ) : (
            <div className="text-center py-8 bg-muted rounded-lg border border-dashed border-border">
              <CircleDot className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Agente ocioso</p>
              <p className="text-xs text-muted-foreground mt-1">Nenhuma execução em andamento</p>
            </div>
          )}
        </section>

        {/* ================================================================ */}
        {/* Fila */}
        {/* ================================================================ */}
        <section>
          <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <ListTodo className="h-4 w-4" />
            Fila
            {queuePending > 0 && (
              <Badge variant="secondary" className="text-xs ml-1">
                {queuePending}
              </Badge>
            )}
          </h4>

          {queueItems.length > 0 ? (
            <div className="space-y-2">
              {queueItems.map((item, i) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between bg-muted rounded-lg px-3 py-2 border text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground w-5">#{i + 1}</span>
                    <span className="text-foreground truncate max-w-[200px]">{item.taskId}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    P{item.priority}
                  </Badge>
                </div>
              ))}
              {queuePending > 3 && (
                <p className="text-xs text-muted-foreground text-center">
                  +{queuePending - 3} tarefa{queuePending - 3 !== 1 ? 's' : ''} na fila
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4 bg-muted rounded-lg border border-dashed border-border">
              Fila vazia
            </p>
          )}
        </section>

        {/* ================================================================ */}
        {/* Estatísticas */}
        {/* ================================================================ */}
        <section>
          <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Estatísticas
          </h4>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-muted rounded-lg px-3 py-3 border text-center">
              <div className="flex items-center justify-center gap-1.5 text-green-600 mb-1">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <p className="text-lg font-bold text-foreground">{todayCompleted}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Hoje</p>
            </div>

            <div className="bg-muted rounded-lg px-3 py-3 border text-center">
              <div className="flex items-center justify-center gap-1.5 text-blue-600 mb-1">
                <TrendingUp className="h-4 w-4" />
              </div>
              <p className="text-lg font-bold text-foreground">
                {agent.successRate > 0 ? `${Math.round(agent.successRate)}%` : '—'}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Sucesso</p>
            </div>

            <div className="bg-muted rounded-lg px-3 py-3 border text-center">
              <div className="flex items-center justify-center gap-1.5 text-purple-600 mb-1">
                <Clock className="h-4 w-4" />
              </div>
              <p className="text-lg font-bold text-foreground">
                {avgDuration ? formatDuration(avgDuration) : '—'}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Média</p>
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/* Actions */}
        {/* ================================================================ */}
        <div className="flex items-center gap-2 pt-2 border-t">
          <button
            onClick={handleExecuteNext}
            disabled={queuePending === 0 || !!activeExecution || actionLoading === 'execute'}
            className="flex-1 flex items-center justify-center gap-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-muted disabled:text-muted-foreground rounded-lg px-4 py-2.5 transition-colors disabled:cursor-not-allowed"
          >
            {actionLoading === 'execute' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Executar Próxima
          </button>

          {activeExecution?.status === 'RUNNING' && (
            <button
              onClick={handlePause}
              disabled={actionLoading === 'pause'}
              className="flex items-center justify-center gap-2 text-sm font-medium text-yellow-700 bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 rounded-lg px-4 py-2.5 transition-colors"
            >
              {actionLoading === 'pause' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Pause className="h-4 w-4" />
              )}
              Pausar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
