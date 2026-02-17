"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useQueryClient } from "@tanstack/react-query"
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
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { notifyError, notifySuccess, notifyInfo } from "@/lib/notifications"
import { useTasks } from "@/lib/hooks/use-tasks"
import { useAgents } from "@/lib/hooks/use-agents"
import { useActiveExecutions } from "@/lib/hooks/use-executions"
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
