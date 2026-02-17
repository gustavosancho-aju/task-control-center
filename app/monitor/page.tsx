"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useQueryClient } from "@tanstack/react-query"
import { Header } from "@/components/layout/Header"
import { AgentMonitor } from "@/components/agents/AgentMonitor"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Activity,
  ListTodo,
  Trash2,
  Play,
  Loader2,
  RefreshCw,
  Clock,
  CheckCircle2,
  TrendingUp,
  Zap,
  ExternalLink,
  Power,
  Pause,
  Settings,
  AlertTriangle,
} from "lucide-react"
import { ExportButton } from "@/components/export/ExportButton"
import { useAgents } from "@/lib/hooks/use-agents"
import {
  ROLE_COLORS as ROLE_COLOR_MAP,
  EXECUTION_COLORS,
  SEMANTIC_COLORS,
  METRIC_COLORS,
} from "@/lib/colors"

// ============================================================================
// Types
// ============================================================================

type AgentRole = "MAESTRO" | "SENTINEL" | "ARCHITECTON" | "PIXEL"

interface AgentInfo {
  id: string
  name: string
  role: AgentRole
}

interface QueueItem {
  id: string
  taskId: string
  agentId: string
  priority: number
  status: string
  createdAt: string
}

interface QueueStats {
  pending: number
  processing: number
  completed: number
  failed: number
  total: number
}

interface Execution {
  id: string
  taskId: string
  agentId: string
  status: string
  startedAt: string | null
  completedAt: string | null
  progress: number
  task?: { id: string; title: string; status: string; priority: string }
  agent?: { id: string; name: string; role: AgentRole }
}

interface ProcessorStatus {
  running: boolean
  interval: number
  lastCheck: string | null
  nextCheck: string | null
  processed: number
  errors: number
  lastError: string | null
}

const ROLE_COLORS: Record<AgentRole, string> = {
  MAESTRO: ROLE_COLOR_MAP.MAESTRO.monitor,
  SENTINEL: ROLE_COLOR_MAP.SENTINEL.monitor,
  ARCHITECTON: ROLE_COLOR_MAP.ARCHITECTON.monitor,
  PIXEL: ROLE_COLOR_MAP.PIXEL.monitor,
}

const STATUS_BADGE: Record<string, string> = {
  QUEUED: EXECUTION_COLORS.QUEUED.badge,
  RUNNING: EXECUTION_COLORS.RUNNING.badge,
  PAUSED: EXECUTION_COLORS.PAUSED.badge,
  COMPLETED: EXECUTION_COLORS.COMPLETED.badge,
  FAILED: EXECUTION_COLORS.FAILED.badge,
  CANCELLED: EXECUTION_COLORS.CANCELLED.badge,
}

// ============================================================================
// Helpers
// ============================================================================

function formatDuration(ms: number): string {
  const sec = Math.floor(ms / 1000)
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`
  if (m > 0) return `${m}m ${s.toString().padStart(2, "0")}s`
  return `${s}s`
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return "agora"
  if (min < 60) return `${min}m atrás`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h atrás`
  return `${Math.floor(h / 24)}d atrás`
}

// ============================================================================
// Component
// ============================================================================

export default function MonitorPage() {
  const queryClient = useQueryClient()
  const agentsQuery = useAgents(false)
  const agents = (agentsQuery.data ?? []) as AgentInfo[]
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null)
  const [queueItems, setQueueItems] = useState<QueueItem[]>([])
  const [recentExecutions, setRecentExecutions] = useState<Execution[]>([])
  const [activeCount, setActiveCount] = useState(0)
  const [todayCompleted, setTodayCompleted] = useState(0)
  const [successRate, setSuccessRate] = useState<number | null>(null)
  const [avgDuration, setAvgDuration] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Processor state
  const [processorStatus, setProcessorStatus] = useState<ProcessorStatus | null>(null)
  const [processorLoading, setProcessorLoading] = useState(false)
  const [intervalInput, setIntervalInput] = useState("")

  // Agent queue distribution for bar chart
  const [agentQueueCounts, setAgentQueueCounts] = useState<Record<string, number>>({})

  // --------------------------------------------------------------------------
  // Data fetching
  // --------------------------------------------------------------------------

  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch("/api/queue")
      if (!res.ok) return
      const data = await res.json()
      if (data.success) {
        setQueueStats(data.data.stats)
        setQueueItems(data.data.items.slice(0, 10))

        // Count per agent
        const counts: Record<string, number> = {}
        for (const item of data.data.items) {
          if (item.status === "PENDING") {
            counts[item.agentId] = (counts[item.agentId] || 0) + 1
          }
        }
        setAgentQueueCounts(counts)
      }
    } catch { /* silent */ }
  }, [])

  const fetchExecutions = useCallback(async () => {
    try {
      const [recentRes, runningRes, completedRes] = await Promise.all([
        fetch("/api/executions?limit=10"),
        fetch("/api/executions?status=RUNNING&limit=50"),
        fetch("/api/executions?status=COMPLETED&limit=50"),
      ])

      if (recentRes.ok) {
        const data = await recentRes.json()
        if (data.success) setRecentExecutions(data.data)
      }

      if (runningRes.ok) {
        const data = await runningRes.json()
        if (data.success) setActiveCount(data.pagination.total)
      }

      if (completedRes.ok) {
        const data = await completedRes.json()
        if (data.success) {
          const executions: Execution[] = data.data

          // Today completed
          const todayStart = new Date()
          todayStart.setHours(0, 0, 0, 0)
          const today = executions.filter(
            (e) => e.completedAt && new Date(e.completedAt) >= todayStart
          )
          setTodayCompleted(today.length)

          // Avg duration
          const durations = executions
            .filter((e) => e.startedAt && e.completedAt)
            .map((e) => new Date(e.completedAt!).getTime() - new Date(e.startedAt!).getTime())

          if (durations.length > 0) {
            setAvgDuration(durations.reduce((a, b) => a + b, 0) / durations.length)
          }
        }
      }

      // Success rate from all terminal executions
      const [compRes, failedRes] = await Promise.all([
        fetch("/api/executions?status=COMPLETED&limit=1"),
        fetch("/api/executions?status=FAILED&limit=1"),
      ])

      let completed = 0
      let failed = 0
      if (compRes.ok) {
        const d = await compRes.json()
        if (d.success) completed = d.pagination.total
      }
      if (failedRes.ok) {
        const d = await failedRes.json()
        if (d.success) failed = d.pagination.total
      }
      const total = completed + failed
      if (total > 0) setSuccessRate(Math.round((completed / total) * 100))
    } catch { /* silent */ }
  }, [])

  const fetchProcessorStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/processor")
      if (!res.ok) return
      const data = await res.json()
      if (data.success) {
        setProcessorStatus(data.data)
        if (!intervalInput) {
          setIntervalInput(String(data.data.interval))
        }
      }
    } catch { /* silent */ }
  }, [intervalInput])

  const fetchAll = useCallback(async () => {
    await Promise.all([fetchQueue(), fetchExecutions(), fetchProcessorStatus()])
    queryClient.invalidateQueries({ queryKey: ["agents"] })
    setLoading(false)
  }, [fetchQueue, fetchExecutions, fetchProcessorStatus, queryClient])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  useEffect(() => {
    const interval = setInterval(fetchAll, 5000)
    return () => clearInterval(interval)
  }, [fetchAll])

  // --------------------------------------------------------------------------
  // Actions
  // --------------------------------------------------------------------------

  const handleProcessAll = async () => {
    setActionLoading("process")
    try {
      // Execute next for each agent that has queue items
      for (const agent of agents) {
        if (agentQueueCounts[agent.id]) {
          await fetch(`/api/agents/${agent.id}/execute`, { method: "POST" })
        }
      }
      await fetchAll()
    } catch { /* silent */ }
    setActionLoading(null)
  }

  const handleClearQueue = async () => {
    setActionLoading("clear")
    try {
      await fetch("/api/queue?status=COMPLETED", { method: "DELETE" })
      await fetch("/api/queue?status=FAILED", { method: "DELETE" })
      await fetchAll()
    } catch { /* silent */ }
    setActionLoading(null)
  }

  const handleProcessorToggle = async () => {
    setProcessorLoading(true)
    try {
      const action = processorStatus?.running ? "stop" : "start"
      const res = await fetch("/api/processor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.success) setProcessorStatus(data.data)
      }
    } catch { /* silent */ }
    setProcessorLoading(false)
  }

  const handleIntervalChange = async () => {
    const seconds = parseInt(intervalInput, 10)
    if (isNaN(seconds) || seconds < 5) return

    setProcessorLoading(true)
    try {
      const res = await fetch("/api/processor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "interval", interval: seconds }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.success) setProcessorStatus(data.data)
      }
    } catch { /* silent */ }
    setProcessorLoading(false)
  }

  // --------------------------------------------------------------------------
  // Find max for bar chart scaling
  // --------------------------------------------------------------------------

  const maxQueueCount = Math.max(1, ...Object.values(agentQueueCounts))

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-muted/40">
      <Header />
      <main className="container mx-auto px-4 py-6 space-y-8">
        {/* ================================================================ */}
        {/* Page header */}
        {/* ================================================================ */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Activity className={`h-6 w-6 ${SEMANTIC_COLORS.info}`} />
              Central de Monitoramento
            </h1>
            <p className="text-sm text-muted-foreground">
              Acompanhe execuções, filas e desempenho dos agentes em tempo real
            </p>
          </div>

          <div className="flex items-center gap-2">
            <ExportButton
              endpoint="/api/export/tasks"
              formats={["csv", "xlsx", "pdf"]}
              label="Exportar Logs"
              size="sm"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => { setLoading(true); fetchAll() }}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* ================================================================ */}
        {/* Processamento Automático */}
        {/* ================================================================ */}
        <section className="bg-card rounded-xl border shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Settings className="h-5 w-5 text-muted-foreground" />
              Processamento Automático
            </h2>
            <div className="flex items-center gap-2">
              {processorStatus && (
                <Badge
                  variant="outline"
                  className={
                    processorStatus.running
                      ? `${EXECUTION_COLORS.COMPLETED.badge}`
                      : "bg-muted text-muted-foreground border-border"
                  }
                >
                  {processorStatus.running ? "Ativo" : "Inativo"}
                </Badge>
              )}
              <Button
                size="sm"
                variant={processorStatus?.running ? "destructive" : "default"}
                onClick={handleProcessorToggle}
                disabled={processorLoading}
                className="gap-1.5"
              >
                {processorLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : processorStatus?.running ? (
                  <Pause className="h-3.5 w-3.5" />
                ) : (
                  <Power className="h-3.5 w-3.5" />
                )}
                {processorStatus?.running ? "Parar" : "Iniciar"}
              </Button>
            </div>
          </div>

          {processorStatus && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Interval config */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Intervalo
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={5}
                    max={3600}
                    value={intervalInput}
                    onChange={(e) => setIntervalInput(e.target.value)}
                    onBlur={handleIntervalChange}
                    onKeyDown={(e) => e.key === "Enter" && handleIntervalChange()}
                    className={`w-20 rounded-md border border-border px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 ${SEMANTIC_COLORS.focusRing}`}
                  />
                  <span className="text-xs text-muted-foreground">seg</span>
                </div>
              </div>

              {/* Last check */}
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Última Verificação
                </p>
                <p className="text-sm font-medium text-foreground">
                  {processorStatus.lastCheck
                    ? timeAgo(processorStatus.lastCheck)
                    : "—"}
                </p>
              </div>

              {/* Processed count */}
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Processadas
                </p>
                <p className="text-sm font-medium text-foreground">
                  {processorStatus.processed}
                </p>
              </div>

              {/* Errors */}
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Erros
                </p>
                <p className={`text-sm font-medium ${processorStatus.errors > 0 ? SEMANTIC_COLORS.error : "text-foreground"}`}>
                  {processorStatus.errors}
                </p>
              </div>
            </div>
          )}

          {/* Last error */}
          {processorStatus?.lastError && (
            <div className={`flex items-start gap-2 rounded-lg px-3 py-2 ${SEMANTIC_COLORS.errorBg}`}>
              <AlertTriangle className={`h-4 w-4 mt-0.5 shrink-0 ${SEMANTIC_COLORS.error}`} />
              <p className={`text-xs font-mono break-all ${SEMANTIC_COLORS.errorText}`}>
                {processorStatus.lastError}
              </p>
            </div>
          )}

          {!processorStatus && loading && (
            <Skeleton className="h-16 rounded-lg" />
          )}
        </section>

        {/* ================================================================ */}
        {/* Métricas em Tempo Real */}
        {/* ================================================================ */}
        <section>
          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                icon={<Zap className={`h-5 w-5 ${SEMANTIC_COLORS.info}`} />}
                label="Execuções Ativas"
                value={activeCount}
                color="blue"
              />
              <MetricCard
                icon={<CheckCircle2 className={`h-5 w-5 ${SEMANTIC_COLORS.success}`} />}
                label="Processadas Hoje"
                value={todayCompleted}
                color="green"
              />
              <MetricCard
                icon={<TrendingUp className={`h-5 w-5 ${SEMANTIC_COLORS.ai}`} />}
                label="Taxa de Sucesso"
                value={successRate !== null ? `${successRate}%` : "—"}
                color="purple"
              />
              <MetricCard
                icon={<Clock className={`h-5 w-5 ${SEMANTIC_COLORS.warning}`} />}
                label="Tempo Médio"
                value={avgDuration ? formatDuration(avgDuration) : "—"}
                color="orange"
              />
            </div>
          )}
        </section>

        {/* ================================================================ */}
        {/* Agent Monitors - Grid 2x2 */}
        {/* ================================================================ */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Agentes</h2>
          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-[500px] rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {agents.map((agent) => (
                <AgentMonitor key={agent.id} agentId={agent.id} />
              ))}
              {agents.length === 0 && (
                <div className="col-span-2 text-center py-12 text-muted-foreground bg-card rounded-xl border">
                  Nenhum agente cadastrado
                </div>
              )}
            </div>
          )}
        </section>

        {/* ================================================================ */}
        {/* Fila Global */}
        {/* ================================================================ */}
        <section className="bg-card rounded-xl border shadow-sm p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ListTodo className="h-5 w-5 text-muted-foreground" />
              Fila Global
              {queueStats && queueStats.pending > 0 && (
                <Badge variant="secondary" className="text-xs ml-1">
                  {queueStats.pending} pendente{queueStats.pending !== 1 ? "s" : ""}
                </Badge>
              )}
            </h2>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={handleProcessAll}
                disabled={!queueStats?.pending || actionLoading === "process"}
              >
                {actionLoading === "process" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
                Processar Todas
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={`gap-1.5 ${SEMANTIC_COLORS.destructiveHover}`}
                onClick={handleClearQueue}
                disabled={!queueStats?.total || actionLoading === "clear"}
              >
                {actionLoading === "clear" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                Limpar Fila
              </Button>
            </div>
          </div>

          {/* Bar chart - queue per agent */}
          {agents.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Distribuição por Agente
              </p>
              <div className="space-y-2">
                {agents.map((agent) => {
                  const count = agentQueueCounts[agent.id] || 0
                  const pct = maxQueueCount > 0 ? (count / maxQueueCount) * 100 : 0

                  return (
                    <div key={agent.id} className="flex items-center gap-3">
                      <span className="text-sm font-medium text-foreground w-28 truncate">
                        {agent.name}
                      </span>
                      <div className="flex-1 bg-muted rounded-full h-5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            ROLE_COLORS[agent.role].split(" ")[0]
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-sm font-mono text-muted-foreground w-8 text-right">
                        {count}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Queue table */}
          {queueItems.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted border-b">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">#</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Tarefa</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Agente</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Prioridade</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Adicionada</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {queueItems.map((item, i) => {
                    const agent = agents.find((a) => a.id === item.agentId)
                    return (
                      <tr key={item.id} className="hover:bg-muted transition-colors">
                        <td className="px-4 py-2.5 font-mono text-muted-foreground">{i + 1}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground truncate max-w-[180px]">
                          {item.taskId}
                        </td>
                        <td className="px-4 py-2.5">
                          {agent ? (
                            <Badge variant="outline" className={`text-xs ${ROLE_COLORS[agent.role]}`}>
                              {agent.name}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">{item.agentId}</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge variant="outline" className="text-xs">P{item.priority}</Badge>
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge variant="outline" className={`text-xs ${STATUS_BADGE[item.status] || ""}`}>
                            {item.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">
                          {timeAgo(item.createdAt)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
              Fila vazia — nenhuma tarefa aguardando processamento
            </div>
          )}
        </section>

        {/* ================================================================ */}
        {/* Execuções Recentes */}
        {/* ================================================================ */}
        <section className="bg-card rounded-xl border shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            Execuções Recentes
          </h2>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))}
            </div>
          ) : recentExecutions.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted border-b">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Agente</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Tarefa</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Duração</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Progresso</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {recentExecutions.map((exec) => {
                    const duration =
                      exec.startedAt && exec.completedAt
                        ? new Date(exec.completedAt).getTime() - new Date(exec.startedAt).getTime()
                        : null

                    return (
                      <tr key={exec.id} className="hover:bg-muted transition-colors">
                        <td className="px-4 py-2.5">
                          <Badge variant="outline" className={`text-xs ${STATUS_BADGE[exec.status] || ""}`}>
                            {exec.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5">
                          {exec.agent ? (
                            <Badge variant="outline" className={`text-xs ${ROLE_COLORS[exec.agent.role]}`}>
                              {exec.agent.name}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-foreground truncate max-w-[200px]">
                          {exec.task?.title || exec.taskId}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                          {duration ? formatDuration(duration) : exec.status === "RUNNING" ? "..." : "—"}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-muted rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${STATUS_BADGE[exec.status]?.split(" ")[0] || "bg-muted-foreground"}`}
                                style={{ width: `${exec.progress}%` }}
                              />
                            </div>
                            <span className="text-xs font-mono text-muted-foreground">{exec.progress}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <Link
                            href={`/tasks/${exec.taskId}`}
                            className={`transition-colors ${SEMANTIC_COLORS.info}`}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
              Nenhuma execução registrada
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

// ============================================================================
// Sub-components
// ============================================================================

function MetricCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  color: string
}) {
  const bgMap = METRIC_COLORS

  return (
    <div className={`rounded-xl border p-4 ${bgMap[color] || "bg-muted border-border"}`}>
      <div className="flex items-center gap-2 mb-2">{icon}</div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  )
}
