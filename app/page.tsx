"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { Header } from "@/components/layout/Header"
import { DashboardGrid } from "@/components/dashboard/DashboardGrid"
import { WidgetPicker } from "@/components/dashboard/WidgetPicker"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  RefreshCw,
  Settings2,
  RotateCcw,
  Plus,
  Loader2,
  GitMerge,
  ChevronRight,
  Activity,
  Layers,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { notifyError, notifySuccess, notifyInfo } from "@/lib/notifications"
import { useTasks } from "@/lib/hooks/use-tasks"
import { useAgents } from "@/lib/hooks/use-agents"
import { useActiveExecutions } from "@/lib/hooks/use-executions"
import { useTaskUpdates } from "@/lib/hooks/use-task-updates"
import { DashboardSkeleton } from "@/components/ui/skeletons"
import {
  DEFAULT_DASHBOARD_LAYOUT,
  WIDGET_REGISTRY,
  type DashboardLayout,
  type WidgetConfig,
  type WidgetType,
  type DashboardData,
  type DashboardTask,
  type DashboardAgent,
  type DashboardExecution,
} from "@/types/dashboard"

// ---------------------------------------------------------------------------
// Active Orchestrations section
// ---------------------------------------------------------------------------

type OrchStatus =
  | "PLANNING" | "CREATING_SUBTASKS" | "ASSIGNING_AGENTS"
  | "EXECUTING" | "REVIEWING" | "COMPLETED" | "FAILED"

interface ActiveOrchestration {
  id: string
  status: OrchStatus
  totalSubtasks: number
  completedSubtasks: number
  currentPhase?: string | null
  createdAt: string
  parentTask: { id: string; title: string; priority: string }
}

const ACTIVE_ORCH_STATUSES = new Set<OrchStatus>([
  "PLANNING", "CREATING_SUBTASKS", "ASSIGNING_AGENTS", "EXECUTING", "REVIEWING",
])

const ORCH_STATUS_LABELS: Record<OrchStatus, string> = {
  PLANNING:          "Planejando",
  CREATING_SUBTASKS: "Criando subtarefas",
  ASSIGNING_AGENTS:  "Atribuindo agentes",
  EXECUTING:         "Executando",
  REVIEWING:         "Revisando",
  COMPLETED:         "Concluído",
  FAILED:            "Falhou",
}

function ActiveOrchCard({ orch }: { orch: ActiveOrchestration }) {
  const progress = orch.totalSubtasks > 0
    ? Math.round((orch.completedSubtasks / orch.totalSubtasks) * 100)
    : 0
  const isExecuting = orch.status === "EXECUTING"

  return (
    <Link
      href={`/orchestration/${orch.id}`}
      className="block rounded-lg border bg-card p-3.5 hover:border-primary/40 hover:shadow-sm transition-all group"
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5">
          {isExecuting ? (
            <span className="relative flex h-2 w-2 mt-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
            </span>
          ) : (
            <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
            {orch.parentTask.title}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] text-muted-foreground">
              {ORCH_STATUS_LABELS[orch.status]}
            </span>
            {orch.currentPhase && (
              <span className="text-[11px] text-muted-foreground truncate">
                · {orch.currentPhase}
              </span>
            )}
          </div>
          {orch.totalSubtasks > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                {orch.completedSubtasks}/{orch.totalSubtasks}
              </span>
            </div>
          )}
        </div>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0 mt-0.5 group-hover:text-primary/60 transition-colors" />
      </div>
    </Link>
  )
}

function ActiveOrchestrationsSection() {
  const [orchestrations, setOrchestrations] = useState<ActiveOrchestration[]>([])
  const [loading, setLoading] = useState(true)

  const fetchActive = useCallback(async () => {
    try {
      const res = await fetch("/api/orchestrate?limit=50", { cache: "no-store" })
      if (!res.ok) return
      const json = await res.json()
      if (!json.success) return
      const active = (json.data as ActiveOrchestration[]).filter(
        o => ACTIVE_ORCH_STATUSES.has(o.status)
      )
      setOrchestrations(active)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchActive()
    const interval = setInterval(fetchActive, 10_000)
    return () => clearInterval(interval)
  }, [fetchActive])

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-5 w-40 rounded bg-muted animate-pulse" />
          <div className="h-4 w-16 rounded bg-muted animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1,2].map(i => (
            <div key={i} className="rounded-lg border bg-card p-3.5 animate-pulse space-y-2">
              <div className="h-4 w-3/4 rounded bg-muted" />
              <div className="h-3 w-1/2 rounded bg-muted" />
              <div className="h-1 w-full rounded-full bg-muted" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (orchestrations.length === 0) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-6 w-6 rounded-md bg-blue-100 dark:bg-blue-900/30">
            <Activity className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-sm font-semibold">
            Orquestrações Ativas
          </h2>
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-500 px-1.5 text-[10px] font-bold text-white">
            {orchestrations.length}
          </span>
        </div>
        <Link
          href="/orchestrations"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Ver todas
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {orchestrations.map(orch => (
          <ActiveOrchCard key={orch.id} orch={orch} />
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Mini donut (SVG) — kept as compact dashboard header indicator
// ---------------------------------------------------------------------------

const SVG_STATUS_COLORS: Record<string, string> = {
  TODO: "oklch(0.55 0.02 260)",
  IN_PROGRESS: "oklch(0.59 0.2 260)",
  REVIEW: "oklch(0.78 0.17 85)",
  DONE: "oklch(0.65 0.2 145)",
  BLOCKED: "oklch(0.63 0.24 25)",
}

function MiniDonut({ tasks }: { tasks: DashboardTask[] }) {
  const total = tasks.length
  if (total === 0) return null

  const counts: Record<string, number> = {}
  for (const t of tasks) counts[t.status] = (counts[t.status] || 0) + 1

  const radius = 16
  const circumference = 2 * Math.PI * radius
  let offset = 0

  const segments = Object.entries(counts).map(([status, count]) => {
    const pct = count / total
    const dash = pct * circumference
    const seg = { status, dash, gap: circumference - dash, offset, color: SVG_STATUS_COLORS[status] || "oklch(0.63 0.02 260)" }
    offset += dash
    return seg
  })

  return (
    <svg width="40" height="40" viewBox="0 0 40 40" className="shrink-0">
      <circle cx="20" cy="20" r={radius} fill="none" className="stroke-muted" strokeWidth="6" />
      {segments.map((seg) => (
        <circle
          key={seg.status}
          cx="20"
          cy="20"
          r={radius}
          fill="none"
          stroke={seg.color}
          strokeWidth="6"
          strokeDasharray={`${seg.dash} ${seg.gap}`}
          strokeDashoffset={-seg.offset}
          transform="rotate(-90 20 20)"
        />
      ))}
      <text x="20" y="20" textAnchor="middle" dominantBaseline="central" className="text-[9px] font-bold fill-foreground">
        {total}
      </text>
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Layout persistence helpers
// ---------------------------------------------------------------------------

const LAYOUT_STORAGE_KEY = "tcc-dashboard-layout"

function loadLayoutFromStorage(): DashboardLayout | null {
  try {
    const raw = localStorage.getItem(LAYOUT_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed?.widgets && Array.isArray(parsed.widgets)) return parsed as DashboardLayout
    return null
  } catch {
    return null
  }
}

function saveLayoutToStorage(layout: DashboardLayout) {
  try {
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layout))
  } catch {
    // silent
  }
}

function saveLayoutToServer(layout: DashboardLayout) {
  fetch("/api/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dashboardWidgets: layout }),
  }).catch(() => {
    // silent — localStorage is the primary store
  })
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Dashboard() {
  const queryClient = useQueryClient()
  useTaskUpdates() // SSE: atualiza automaticamente quando agentes mudam status

  // React Query hooks
  const tasksQuery = useTasks({ limit: 100 })
  const agentsQuery = useAgents()
  const activeExecsQuery = useActiveExecutions()

  const tasks = (tasksQuery.data?.data ?? []) as DashboardTask[]
  const agents = (agentsQuery.data ?? []) as DashboardAgent[]
  const activeExecutions = (activeExecsQuery.data ?? []) as DashboardExecution[]
  const loading = tasksQuery.isLoading
  const refreshing = tasksQuery.isFetching && !tasksQuery.isLoading

  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Dashboard layout state
  const [layout, setLayout] = useState<DashboardLayout>(DEFAULT_DASHBOARD_LAYOUT)
  const [isEditing, setIsEditing] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [layoutLoaded, setLayoutLoaded] = useState(false)

  // -----------------------------------------------------------------------
  // Load saved layout
  // -----------------------------------------------------------------------

  useEffect(() => {
    const saved = loadLayoutFromStorage()
    if (saved) setLayout(saved)
    setLayoutLoaded(true)
  }, [])

  // Track last updated time
  useEffect(() => {
    if (tasksQuery.dataUpdatedAt) {
      setLastUpdated(new Date(tasksQuery.dataUpdatedAt))
    }
  }, [tasksQuery.dataUpdatedAt])

  // Show error notification
  useEffect(() => {
    if (tasksQuery.error) {
      notifyError("Erro ao carregar tarefas")
    }
  }, [tasksQuery.error])

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["tasks"] })
    queryClient.invalidateQueries({ queryKey: ["executions"] })
  }

  // -----------------------------------------------------------------------
  // Dashboard data context for widgets
  // -----------------------------------------------------------------------

  const dashboardData: DashboardData = useMemo(
    () => ({
      tasks,
      agents,
      activeExecutions,
      loading,
      onRefresh: handleRefresh,
    }),
    [tasks, agents, activeExecutions, loading]
  )

  // -----------------------------------------------------------------------
  // Layout management
  // -----------------------------------------------------------------------

  const updateLayout = useCallback((newLayout: DashboardLayout) => {
    setLayout(newLayout)
    saveLayoutToStorage(newLayout)
    saveLayoutToServer(newLayout)
  }, [])

  const handleRemoveWidget = useCallback((widgetId: string) => {
    setLayout((prev) => {
      const next = { widgets: prev.widgets.filter((w) => w.id !== widgetId) }
      saveLayoutToStorage(next)
      saveLayoutToServer(next)
      return next
    })
  }, [])

  const handleAddWidget = useCallback((type: WidgetType) => {
    const meta = WIDGET_REGISTRY[type]
    const newWidget: WidgetConfig = {
      id: `w-${Date.now()}`,
      type,
      size: meta.defaultSize,
    }
    setLayout((prev) => {
      const next = { widgets: [...prev.widgets, newWidget] }
      saveLayoutToStorage(next)
      saveLayoutToServer(next)
      return next
    })
    notifySuccess("Widget adicionado", `"${meta.label}" foi adicionado ao dashboard`)
  }, [])

  const handleResetLayout = useCallback(() => {
    updateLayout(DEFAULT_DASHBOARD_LAYOUT)
    setIsEditing(false)
    notifyInfo("Layout resetado", "Dashboard restaurado ao layout padrão")
  }, [updateLayout])

  const toggleEditing = () => {
    setIsEditing((prev) => !prev)
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-muted/40">
      <Header />
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* ---- Header row ---- */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <MiniDonut tasks={tasks} />
            <div>
              <h1 className="text-2xl font-bold">Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Gerencie as tarefas do Agency Dev Squad
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="text-xs text-muted-foreground hidden sm:inline">
                Atualizado {formatDistanceToNow(lastUpdated, { addSuffix: true, locale: ptBR })}
              </span>
            )}

            {/* Customize controls */}
            {isEditing && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPickerOpen(true)}
                  className="gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Adicionar</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetLayout}
                  className="gap-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Resetar</span>
                </Button>
              </>
            )}

            <Button
              variant={isEditing ? "default" : "outline"}
              size="sm"
              onClick={toggleEditing}
              className="gap-1.5"
            >
              <Settings2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
                {isEditing ? "Concluir" : "Personalizar"}
              </span>
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* ---- Editing hint ---- */}
        {isEditing && (
          <div className="flex items-center gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-4 py-2.5">
            <Settings2 className="h-4 w-4 text-primary shrink-0" />
            <p className="text-sm text-primary">
              Modo de personalização ativo. Remova widgets com o <strong>X</strong> ou adicione novos com o botão <strong>Adicionar</strong>.
            </p>
          </div>
        )}

        {/* ---- Active Orchestrations ---- */}
        <ActiveOrchestrationsSection />

        {/* ---- Dashboard Grid ---- */}
        {loading && !layoutLoaded ? (
          <DashboardSkeleton />
        ) : (
          <DashboardGrid
            widgets={layout.widgets}
            data={dashboardData}
            isEditing={isEditing}
            onRemoveWidget={handleRemoveWidget}
          />
        )}
      </main>

      {/* ---- Widget Picker Modal ---- */}
      <WidgetPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        currentWidgets={layout.widgets}
        onAddWidget={handleAddWidget}
      />
    </div>
  )
}
