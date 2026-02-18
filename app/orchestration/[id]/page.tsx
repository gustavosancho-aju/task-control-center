"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { format, formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Header } from "@/components/layout/Header"
import { OrchestrationView } from "@/components/orchestration/OrchestrationView"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Loader2,
  Play,
  Pause,
  X,
  RotateCcw,
  ExternalLink,
  GitMerge,
  Clock,
  RefreshCw,
  Activity,
  ChevronRight,
  Layers,
  AlertCircle,
  Bot,
  Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ROLE_COLORS, STATUS_COLORS } from "@/lib/colors"
import type { TaskStatus, AgentRole } from "@/lib/colors"

// ============================================================================
// TYPES  (local — mirrors OrchestrationView's internal types)
// ============================================================================

type OrchStatus =
  | "PLANNING" | "CREATING_SUBTASKS" | "ASSIGNING_AGENTS"
  | "EXECUTING"| "REVIEWING" | "COMPLETED" | "FAILED"

type ExecStatus = "QUEUED" | "RUNNING" | "PAUSED" | "COMPLETED" | "FAILED" | "CANCELLED"

interface DepRef { id: string; title: string; status: string }

interface SubtaskData {
  id: string
  title: string
  status: TaskStatus
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"
  agentName?: string | null
  estimatedHours?: number | null
  dependsOn: DepRef[]
  executions: { id: string; status: ExecStatus; progress: number }[]
  isBlocked: boolean
  isReady: boolean
}

interface OrchestrationSummary {
  id: string
  status: OrchStatus
  currentPhase?: string | null
  totalSubtasks: number
  completedSubtasks: number
  plan?: { phases?: { name: string; subtasks: { title: string }[] }[] } | null
  createdAt: string
  completedAt?: string | null
  parentTask: {
    id: string
    title: string
    status: string
    priority: string
  }
  subtasks: SubtaskData[]
  progress: { percent: number; done: number; inProgress: number; total: number }
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ORCH_STATUS_LABEL: Record<OrchStatus, string> = {
  PLANNING:          "Planejando",
  CREATING_SUBTASKS: "Criando subtarefas",
  ASSIGNING_AGENTS:  "Atribuindo agentes",
  EXECUTING:         "Executando",
  REVIEWING:         "Revisando",
  COMPLETED:         "Concluído",
  FAILED:            "Falhou",
}

const AGENT_ICONS: Record<string, string> = {
  MAESTRO: "🎯", SENTINEL: "🛡️", ARCHITECTON: "🏗️", PIXEL: "🎨",
}

function inferRole(name?: string | null): AgentRole | null {
  if (!name) return null
  const u = name.toUpperCase()
  if (u.includes("MAESTRO"))     return "MAESTRO"
  if (u.includes("SENTINEL"))    return "SENTINEL"
  if (u.includes("ARCHITECTON")) return "ARCHITECTON"
  if (u.includes("PIXEL"))       return "PIXEL"
  return null
}

// ============================================================================
// SIDEBAR COMPONENTS
// ============================================================================

function OrchStatusDot({ status }: { status: OrchStatus }) {
  const isActive   = !["COMPLETED", "FAILED"].includes(status)
  const isFailed   = status === "FAILED"
  const isComplete = status === "COMPLETED"
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 text-xs font-medium",
      isComplete && "text-green-600 dark:text-green-400",
      isFailed   && "text-red-500 dark:text-red-400",
      isActive   && !isFailed && "text-blue-600 dark:text-blue-400",
    )}>
      {isActive && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
        </span>
      )}
      {isComplete && <CheckCircle2 className="h-3.5 w-3.5" />}
      {isFailed   && <AlertTriangle className="h-3.5 w-3.5" />}
      {ORCH_STATUS_LABEL[status]}
    </span>
  )
}

interface SubtaskItemProps {
  task: SubtaskData
  onClick: () => void
}

function SidebarSubtaskItem({ task, onClick }: SubtaskItemProps) {
  const exec    = task.executions[0]
  const role    = inferRole(task.agentName)
  const icon    = role ? (AGENT_ICONS[role] ?? "🤖") : "🤖"
  const running = task.status === "IN_PROGRESS"

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left flex items-center gap-2.5 rounded-md px-2.5 py-2",
        "hover:bg-accent transition-colors group text-sm",
        running && "bg-blue-50 dark:bg-blue-950/30",
      )}
    >
      {/* Status indicator */}
      <div className="shrink-0 w-4 flex justify-center">
        {task.status === "DONE"        && <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
        {task.status === "IN_PROGRESS" && <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin" />}
        {task.status === "BLOCKED"     && <AlertTriangle className="h-3.5 w-3.5 text-red-400" />}
        {task.status === "REVIEW"      && <RefreshCw className="h-3.5 w-3.5 text-amber-500" />}
        {task.status === "TODO"        && (
          task.isReady
            ? <Circle className="h-3.5 w-3.5 text-blue-400" />
            : <Circle className="h-3.5 w-3.5 text-muted-foreground/30" />
        )}
      </div>

      {/* Title + agent */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          "truncate text-xs font-medium leading-tight",
          task.status === "DONE"    && "text-muted-foreground line-through",
          task.status === "BLOCKED" && "text-red-600 dark:text-red-400",
        )}>
          {task.title}
        </p>
        {task.agentName && (
          <p className="text-[10px] text-muted-foreground truncate mt-0.5">
            {icon} {task.agentName}
          </p>
        )}
        {/* Mini progress bar for running */}
        {running && exec && (
          <div className="mt-1 h-0.5 rounded-full bg-blue-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-500"
              style={{ width: `${exec.progress}%` }}
            />
          </div>
        )}
      </div>

      <ChevronRight className="h-3 w-3 text-muted-foreground/40 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  )
}

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default function OrchestrationPage() {
  const params = useParams()
  const router = useRouter()
  const id     = params.id as string

  const [data,    setData]    = useState<OrchestrationSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [acting,  setActing]  = useState<string | null>(null)
  const [toast,   setToast]   = useState<{ msg: string; kind: "ok" | "err" } | null>(null)
  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Toast helper ────────────────────────────────────────────────────────
  const showToast = useCallback((msg: string, kind: "ok" | "err" = "ok") => {
    setToast({ msg, kind })
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3500)
  }, [])

  // ── Data fetch ──────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const res  = await fetch(`/api/orchestrate/${id}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error ?? "Erro desconhecido")
      setData(json.data as OrchestrationSummary)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchData()
    return () => {
      if (pollRef.current)    clearInterval(pollRef.current)
      if (toastTimer.current) clearTimeout(toastTimer.current)
    }
  }, [fetchData])

  // ── Polling (5s for sidebar — OrchestrationView polls at 3s independently) ──
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    const done = data ? ["COMPLETED", "FAILED"].includes(data.status) : false
    if (!done) {
      pollRef.current = setInterval(fetchData, 5000)
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [data?.status, fetchData]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Orchestration lifecycle actions ─────────────────────────────────────
  const sendAction = useCallback(async (action: "pause" | "resume" | "cancel" | "monitor") => {
    setActing(action)
    try {
      const res = await fetch(`/api/orchestrate/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      await fetchData()
      showToast(
        action === "pause"  ? "Orquestração pausada"  :
        action === "resume" ? "Orquestração retomada" :
        action === "cancel" ? "Orquestração cancelada":
        "Ciclo de monitoramento executado"
      )
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erro na ação", "err")
    } finally {
      setActing(null)
    }
  }, [id, fetchData, showToast])

  // ── Retry failed subtasks ────────────────────────────────────────────────
  const retryFailed = useCallback(async () => {
    if (!data) return
    const failedTasks = data.subtasks.filter(
      t => t.executions[0]?.status === "FAILED" || t.status === "BLOCKED"
    )
    if (failedTasks.length === 0) {
      showToast("Nenhuma tarefa falhou para reexecutar", "err")
      return
    }

    setActing("retry")
    let resetCount = 0
    try {
      // Reset failed/blocked tasks to TODO
      await Promise.allSettled(
        failedTasks.map(task =>
          fetch(`/api/tasks/${task.id}`, {
            method:  "PATCH",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ status: "TODO" }),
          }).then(r => { if (r.ok) resetCount++ })
        )
      )

      // Re-queue via resume action
      await fetch(`/api/orchestrate/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "resume" }),
      })

      await fetchData()
      showToast(`${resetCount} tarefa(s) reiniciada(s) para execução`)
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erro ao reexecutar", "err")
    } finally {
      setActing(null)
    }
  }, [data, id, fetchData, showToast])

  // ── Derived state ────────────────────────────────────────────────────────
  const isActive    = data ? !["COMPLETED", "FAILED"].includes(data.status) : false
  const isExecuting = data?.status === "EXECUTING"
  const isPaused    = data?.subtasks.some(t => t.executions[0]?.status === "PAUSED") ?? false
  const failedCount = data?.subtasks.filter(
    t => t.executions[0]?.status === "FAILED" || t.status === "BLOCKED"
  ).length ?? 0

  // Build phase groups for sidebar
  const planPhases = data?.plan?.phases ?? []
  type SidebarPhase = { name: string; tasks: SubtaskData[] }
  const sidebarPhases: SidebarPhase[] = []

  if (data) {
    if (planPhases.length > 0) {
      for (const phase of planPhases) {
        const titles = new Set(phase.subtasks.map(s => s.title))
        const tasks  = data.subtasks.filter(t => titles.has(t.title))
        if (tasks.length > 0) sidebarPhases.push({ name: phase.name, tasks })
      }
      const inPhase   = new Set(sidebarPhases.flatMap(g => g.tasks.map(t => t.id)))
      const orphans   = data.subtasks.filter(t => !inPhase.has(t.id))
      if (orphans.length > 0) sidebarPhases.push({ name: "Outros", tasks: orphans })
    } else {
      sidebarPhases.push({ name: "Subtarefas", tasks: data.subtasks })
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-muted/40 overflow-hidden">
      <Header />

      {/* Toast notification */}
      {toast && (
        <div className={cn(
          "fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg border px-4 py-2.5 shadow-lg",
          "text-sm font-medium transition-all duration-300",
          toast.kind === "ok"
            ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300"
            : "bg-red-50 border-red-200 text-red-700 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300",
        )}>
          {toast.kind === "ok"
            ? <CheckCircle2 className="h-4 w-4 shrink-0" />
            : <AlertCircle className="h-4 w-4 shrink-0" />}
          {toast.msg}
        </div>
      )}

      {/* Body — sidebar + main */}
      <div className="flex flex-1 min-h-0">

        {/* ── SIDEBAR ─────────────────────────────────────────────────── */}
        <aside className="w-72 shrink-0 border-r bg-background flex flex-col overflow-hidden">

          {/* Back + task info */}
          <div className="px-4 py-3 border-b space-y-2">
            {data ? (
              <Link
                href={`/tasks/${data.parentTask.id}`}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Voltar à tarefa
              </Link>
            ) : (
              <button
                onClick={() => router.back()}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Voltar
              </button>
            )}

            {loading && !data ? (
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando…
              </div>
            ) : data ? (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <GitMerge className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <p className="text-sm font-semibold truncate">{data.parentTask.title}</p>
                </div>
                <OrchStatusDot status={data.status} />
                {data.currentPhase && (
                  <p className="text-[10px] text-muted-foreground truncate">{data.currentPhase}</p>
                )}
              </div>
            ) : null}
          </div>

          {/* Progress summary */}
          {data && (
            <div className="px-4 py-2.5 border-b">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-muted-foreground">Progresso</span>
                <span className="text-xs font-semibold tabular-nums">
                  {data.progress.done}/{data.progress.total}
                  <span className="text-muted-foreground font-normal ml-1">
                    ({data.progress.percent}%)
                  </span>
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-green-500 transition-all duration-500"
                  style={{ width: `${data.progress.percent}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-[10px] text-muted-foreground">
                  {data.progress.inProgress > 0 && (
                    <span className="flex items-center gap-1 text-blue-500 dark:text-blue-400">
                      <Activity className="h-2.5 w-2.5" />
                      {data.progress.inProgress} rodando
                    </span>
                  )}
                </span>
                {data.createdAt && (
                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                    <Clock className="h-2.5 w-2.5" />
                    {formatDistanceToNow(new Date(data.createdAt), { locale: ptBR, addSuffix: false })}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="px-3 py-2.5 border-b space-y-1.5">
            {/* Pausar / Retomar */}
            {isActive && isExecuting && !isPaused && (
              <Button
                variant="outline" size="sm" className="w-full justify-start gap-2 h-8"
                disabled={!!acting}
                onClick={() => sendAction("pause")}
              >
                {acting === "pause"
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Pause className="h-3.5 w-3.5" />}
                Pausar execução
              </Button>
            )}
            {isActive && isPaused && (
              <Button
                variant="outline" size="sm"
                className="w-full justify-start gap-2 h-8 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                disabled={!!acting}
                onClick={() => sendAction("resume")}
              >
                {acting === "resume"
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Play className="h-3.5 w-3.5" />}
                Retomar execução
              </Button>
            )}

            {/* Reexecutar falhas */}
            {failedCount > 0 && (
              <Button
                variant="outline" size="sm"
                className="w-full justify-start gap-2 h-8 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                disabled={!!acting}
                onClick={retryFailed}
              >
                {acting === "retry"
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <RotateCcw className="h-3.5 w-3.5" />}
                Reexecutar falhas
                <Badge variant="secondary" className="ml-auto h-4 px-1 text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                  {failedCount}
                </Badge>
              </Button>
            )}

            {/* Cancelar */}
            {isActive && (
              <Button
                variant="outline" size="sm"
                className="w-full justify-start gap-2 h-8 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-900/20"
                disabled={!!acting}
                onClick={() => {
                  if (confirm("Cancelar toda a orquestração? Esta ação não pode ser desfeita.")) {
                    sendAction("cancel")
                  }
                }}
              >
                {acting === "cancel"
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <X className="h-3.5 w-3.5" />}
                Cancelar tudo
              </Button>
            )}

            {/* Ver tarefa original */}
            {data && (
              <Button
                variant="ghost" size="sm"
                className="w-full justify-start gap-2 h-8 text-muted-foreground"
                onClick={() => window.open(`/tasks/${data.parentTask.id}`, "_blank")}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Ver tarefa original
              </Button>
            )}
          </div>

          {/* Subtask list */}
          <div className="flex-1 overflow-y-auto">
            {loading && !data ? (
              <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground text-xs">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando subtarefas…
              </div>
            ) : sidebarPhases.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground text-xs">
                <Layers className="h-6 w-6 opacity-30" />
                <span>Sem subtarefas ainda</span>
              </div>
            ) : (
              <div className="py-2">
                {sidebarPhases.map((phase, pi) => {
                  const phaseDone    = phase.tasks.filter(t => t.status === "DONE").length
                  const phaseRunning = phase.tasks.filter(t => t.status === "IN_PROGRESS").length
                  return (
                    <div key={phase.name}>
                      {/* Phase header */}
                      <div className="flex items-center justify-between px-4 py-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground truncate">
                          {phase.name}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {phaseRunning > 0 && (
                            <span className="text-[10px] text-blue-500 flex items-center gap-0.5">
                              <Loader2 className="h-2.5 w-2.5 animate-spin" />{phaseRunning}
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground">
                            {phaseDone}/{phase.tasks.length}
                          </span>
                        </div>
                      </div>

                      {/* Tasks */}
                      <div className="px-2 space-y-0.5">
                        {phase.tasks.map(task => (
                          <SidebarSubtaskItem
                            key={task.id}
                            task={task}
                            onClick={() => window.open(`/tasks/${task.id}`, "_blank")}
                          />
                        ))}
                      </div>

                      {pi < sidebarPhases.length - 1 && (
                        <Separator className="my-2 mx-4 w-auto" />
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Sidebar footer */}
          {data?.completedAt && (
            <div className="px-4 py-2 border-t text-[10px] text-muted-foreground">
              Concluído {format(new Date(data.completedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </div>
          )}
        </aside>

        {/* ── MAIN CONTENT ─────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto">

          {/* Top action bar */}
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b px-6 py-3 flex items-center gap-3">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground min-w-0 flex-1">
              <Link href="/" className="hover:text-foreground transition-colors shrink-0">
                Dashboard
              </Link>
              <ChevronRight className="h-3.5 w-3.5 shrink-0" />
              {data ? (
                <>
                  <Link
                    href={`/tasks/${data.parentTask.id}`}
                    className="hover:text-foreground transition-colors truncate max-w-[180px]"
                  >
                    {data.parentTask.title}
                  </Link>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                  <span className="text-foreground font-medium shrink-0">Orquestração</span>
                </>
              ) : (
                <span className="text-foreground font-medium">Orquestração</span>
              )}
            </div>

            {/* Right: quick actions */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Pausar / Retomar — compact version for topbar */}
              {isActive && isExecuting && !isPaused && (
                <Button
                  variant="outline" size="sm" className="gap-1.5 h-8"
                  disabled={!!acting}
                  onClick={() => sendAction("pause")}
                >
                  {acting === "pause"
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Pause className="h-3.5 w-3.5" />}
                  <span className="hidden sm:inline">Pausar</span>
                </Button>
              )}
              {isActive && isPaused && (
                <Button
                  variant="outline" size="sm"
                  className="gap-1.5 h-8 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                  disabled={!!acting}
                  onClick={() => sendAction("resume")}
                >
                  {acting === "resume"
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Play className="h-3.5 w-3.5" />}
                  <span className="hidden sm:inline">Retomar</span>
                </Button>
              )}

              {failedCount > 0 && (
                <Button
                  variant="outline" size="sm"
                  className="gap-1.5 h-8 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                  disabled={!!acting}
                  onClick={retryFailed}
                >
                  {acting === "retry"
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <RotateCcw className="h-3.5 w-3.5" />}
                  <span className="hidden sm:inline">Retry</span>
                  <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                    {failedCount}
                  </Badge>
                </Button>
              )}

              {isActive && (
                <Button
                  variant="outline" size="sm"
                  className="gap-1.5 h-8 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900"
                  disabled={!!acting}
                  onClick={() => {
                    if (confirm("Cancelar toda a orquestração?")) sendAction("cancel")
                  }}
                >
                  {acting === "cancel"
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <X className="h-3.5 w-3.5" />}
                  <span className="hidden sm:inline">Cancelar</span>
                </Button>
              )}

              {data?.status === "COMPLETED" && (
                <Button
                  size="sm" className="gap-1.5 h-8"
                  onClick={() => window.open(`/tasks/${data.parentTask.id}`, "_blank")}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Ver resultado</span>
                </Button>
              )}
            </div>
          </div>

          {/* Error state */}
          {error && !data && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center space-y-3">
                <AlertCircle className="h-10 w-10 text-red-400 mx-auto" />
                <p className="text-sm text-muted-foreground">{error}</p>
                <Button variant="outline" size="sm" onClick={fetchData}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Tentar novamente
                </Button>
              </div>
            </div>
          )}

          {/* OrchestrationView — the main panel */}
          {(!error || data) && (
            <div className="p-6">
              <OrchestrationView orchestrationId={id} />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
