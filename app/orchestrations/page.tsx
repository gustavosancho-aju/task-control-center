"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { formatDistanceToNow, format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Header } from "@/components/layout/Header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  GitMerge,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Clock,
  Activity,
  ChevronRight,
  Layers,
  Search,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type OrchStatus =
  | "PLANNING" | "CREATING_SUBTASKS" | "ASSIGNING_AGENTS"
  | "EXECUTING" | "REVIEWING" | "COMPLETED" | "FAILED"

interface OrchestrationItem {
  id: string
  status: OrchStatus
  totalSubtasks: number
  completedSubtasks: number
  currentPhase?: string | null
  createdAt: string
  updatedAt: string
  completedAt?: string | null
  parentTask: {
    id: string
    title: string
    status: string
    priority: string
  }
  _count: { subtasks: number }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<OrchStatus, string> = {
  PLANNING:          "Planejando",
  CREATING_SUBTASKS: "Criando subtarefas",
  ASSIGNING_AGENTS:  "Atribuindo agentes",
  EXECUTING:         "Executando",
  REVIEWING:         "Revisando",
  COMPLETED:         "Concluído",
  FAILED:            "Falhou",
}

const STATUS_BADGE_VARIANTS: Record<OrchStatus, string> = {
  PLANNING:          "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  CREATING_SUBTASKS: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  ASSIGNING_AGENTS:  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  EXECUTING:         "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  REVIEWING:         "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  COMPLETED:         "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  FAILED:            "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
}

const ACTIVE_STATUSES: OrchStatus[] = [
  "PLANNING", "CREATING_SUBTASKS", "ASSIGNING_AGENTS", "EXECUTING", "REVIEWING",
]

const FILTER_TABS = [
  { label: "Todas", value: "" },
  { label: "Ativas", value: "active" },
  { label: "Executando", value: "EXECUTING" },
  { label: "Concluídas", value: "COMPLETED" },
  { label: "Falhou", value: "FAILED" },
]

const PRIORITY_COLORS: Record<string, string> = {
  LOW:    "text-slate-500",
  MEDIUM: "text-blue-500",
  HIGH:   "text-amber-500",
  URGENT: "text-red-500",
}

// ---------------------------------------------------------------------------
// OrchestrationCard
// ---------------------------------------------------------------------------

function OrchestrationCard({ orch }: { orch: OrchestrationItem }) {
  const isActive    = ACTIVE_STATUSES.includes(orch.status)
  const isComplete  = orch.status === "COMPLETED"
  const isFailed    = orch.status === "FAILED"
  const isExecuting = orch.status === "EXECUTING"
  const progress    = orch.totalSubtasks > 0
    ? Math.round((orch.completedSubtasks / orch.totalSubtasks) * 100)
    : 0

  return (
    <Link href={`/orchestration/${orch.id}`} className="block group">
      <div className={cn(
        "rounded-xl border bg-card p-5 space-y-3 transition-all duration-150",
        "hover:border-primary/40 hover:shadow-sm",
        isActive && "border-blue-200 dark:border-blue-800/50",
        isFailed && "border-red-200 dark:border-red-800/50",
      )}>
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Status badge */}
            <div className="flex items-center gap-2 mb-1.5">
              <span className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                STATUS_BADGE_VARIANTS[orch.status],
              )}>
                {isExecuting && (
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500" />
                  </span>
                )}
                {isComplete  && <CheckCircle2 className="h-2.5 w-2.5" />}
                {isFailed    && <AlertTriangle className="h-2.5 w-2.5" />}
                {STATUS_LABELS[orch.status]}
              </span>
              {orch.currentPhase && isActive && (
                <span className="text-[11px] text-muted-foreground truncate max-w-[140px]">
                  {orch.currentPhase}
                </span>
              )}
            </div>

            {/* Task title */}
            <p className="font-semibold text-sm leading-snug group-hover:text-primary transition-colors truncate">
              {orch.parentTask.title}
            </p>
          </div>

          <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-1 group-hover:text-primary/60 transition-colors" />
        </div>

        {/* Progress bar */}
        {orch.totalSubtasks > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Layers className="h-3 w-3" />
                {orch.completedSubtasks}/{orch.totalSubtasks} subtarefas
              </span>
              <span className="font-semibold tabular-nums">{progress}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  isComplete ? "bg-green-500" : isFailed ? "bg-red-400" : "bg-blue-500",
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-0.5">
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className={cn("font-medium", PRIORITY_COLORS[orch.parentTask.priority])}>
              {orch.parentTask.priority}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(orch.createdAt), { addSuffix: true, locale: ptBR })}
            </span>
          </div>
          {isActive && (
            <span className="flex items-center gap-1 text-[11px] text-blue-500 dark:text-blue-400">
              <Activity className="h-3 w-3" />
              ativa
            </span>
          )}
          {isComplete && orch.completedAt && (
            <span className="text-[11px] text-green-600 dark:text-green-400">
              {format(new Date(orch.completedAt), "dd/MM HH:mm", { locale: ptBR })}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function OrchestrationsPage() {
  const [orchestrations, setOrchestrations] = useState<OrchestrationItem[]>([])
  const [loading, setLoading]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [total, setTotal]       = useState(0)
  const [filter, setFilter]     = useState("")
  const [search, setSearch]     = useState("")

  const fetchOrchestrations = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      // For "active" pseudo-filter, fetch all and filter client-side
      const statusParam = filter && filter !== "active" ? `&status=${filter}` : ""
      const res = await fetch(`/api/orchestrate?limit=100${statusParam}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      let data = json.data as OrchestrationItem[]
      if (filter === "active") {
        data = data.filter(o => ACTIVE_STATUSES.includes(o.status))
      }
      setOrchestrations(data)
      setTotal(json.pagination?.total ?? data.length)
    } catch (err) {
      console.error("[orchestrations page] fetch error:", err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [filter])

  useEffect(() => {
    fetchOrchestrations()
  }, [fetchOrchestrations])

  // Auto-refresh every 10s if there are active orchestrations
  useEffect(() => {
    const hasActive = orchestrations.some(o => ACTIVE_STATUSES.includes(o.status))
    if (!hasActive) return
    const interval = setInterval(() => fetchOrchestrations(), 10_000)
    return () => clearInterval(interval)
  }, [orchestrations, fetchOrchestrations])

  // Local search filter
  const filtered = search
    ? orchestrations.filter(o =>
        o.parentTask.title.toLowerCase().includes(search.toLowerCase())
      )
    : orchestrations

  const activeCount = orchestrations.filter(o => ACTIVE_STATUSES.includes(o.status)).length

  return (
    <div className="min-h-screen bg-muted/40">
      <Header />
      <main className="container mx-auto px-4 py-6 space-y-6">

        {/* Page header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <GitMerge className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Orquestrações</h1>
              <p className="text-sm text-muted-foreground">
                {activeCount > 0
                  ? `${activeCount} ativa${activeCount > 1 ? "s" : ""} · ${total} no total`
                  : `${total} orquestração${total !== 1 ? "ões" : ""}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => fetchOrchestrations(true)}
              disabled={refreshing}
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            </Button>
            <Link href="/create">
              <Button size="sm" className="gap-1.5">
                Nova Tarefa
              </Button>
            </Link>
          </div>
        </div>

        {/* Filters + Search */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Status tabs */}
          <div className="flex items-center gap-1 rounded-lg border bg-background p-1">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setFilter(tab.value)}
                className={cn(
                  "rounded-md px-3 py-1 text-sm font-medium transition-colors",
                  filter === tab.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
              >
                {tab.label}
                {tab.value === "active" && activeCount > 0 && (
                  <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-bold text-white">
                    {activeCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por tarefa..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-lg border bg-background pl-8 pr-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border bg-card p-5 space-y-3 animate-pulse">
                <div className="h-4 w-24 rounded-full bg-muted" />
                <div className="h-4 w-3/4 rounded bg-muted" />
                <div className="h-1.5 w-full rounded-full bg-muted" />
                <div className="h-3 w-1/2 rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
            <GitMerge className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-lg font-medium text-muted-foreground">
              {search ? "Nenhuma orquestração encontrada" : "Sem orquestrações"}
            </p>
            <p className="text-sm text-muted-foreground max-w-sm">
              {search
                ? `Nenhum resultado para "${search}"`
                : "Orquestre uma tarefa clicando em \"🎯 Orquestrar com Maestro\" na página de detalhes de uma tarefa."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((orch) => (
              <OrchestrationCard key={orch.id} orch={orch} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
