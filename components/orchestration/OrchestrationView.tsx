"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  CheckCircle2, Circle, Clock, AlertTriangle, Loader2,
  Play, Pause, X, ChevronDown, ChevronRight,
  ExternalLink, GitMerge, Activity, Terminal, RefreshCw,
  ArrowRight, Zap, List,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { STATUS_COLORS, ROLE_COLORS } from "@/lib/colors"
import type { TaskStatus, AgentRole } from "@/lib/colors"
import { DependencyGraph } from "@/components/orchestration/DependencyGraph"

// ============================================================================
// TYPES
// ============================================================================

type OrchStatus =
  | "PLANNING" | "CREATING_SUBTASKS" | "ASSIGNING_AGENTS"
  | "EXECUTING" | "REVIEWING" | "COMPLETED" | "FAILED"

type ExecStatus = "QUEUED" | "RUNNING" | "PAUSED" | "COMPLETED" | "FAILED" | "CANCELLED"

interface DepRef { id: string; title: string; status: string }

interface SubtaskData {
  id: string
  title: string
  description?: string | null
  status: TaskStatus
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"
  agentId?: string | null
  agentName?: string | null
  estimatedHours?: number | null
  createdAt: string
  completedAt?: string | null
  dependsOn: DepRef[]
  dependents: DepRef[]
  executions: { id: string; status: ExecStatus; progress: number; startedAt?: string; completedAt?: string }[]
  isBlocked: boolean
  isReady: boolean
}

interface OrchestrationData {
  id: string
  status: OrchStatus
  currentPhase?: string | null
  totalSubtasks: number
  completedSubtasks: number
  plan?: { phases?: { name: string; subtasks: { title: string; agent: string }[] }[] } | null
  createdAt: string
  updatedAt: string
  completedAt?: string | null
  parentTask: { id: string; title: string; status: string; priority: string; description?: string | null }
  subtasks: SubtaskData[]
  progress: { percent: number; done: number; inProgress: number; total: number; remaining: number }
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PIPELINE_STEPS: { key: OrchStatus; label: string; short: string }[] = [
  { key: "PLANNING",           label: "Planejamento",  short: "Plan"    },
  { key: "CREATING_SUBTASKS",  label: "Subtarefas",    short: "Criar"   },
  { key: "ASSIGNING_AGENTS",   label: "Agentes",       short: "Assign"  },
  { key: "EXECUTING",          label: "Execução",      short: "Exec"    },
  { key: "REVIEWING",          label: "Revisão",       short: "Review"  },
  { key: "COMPLETED",          label: "Concluído",     short: "Done"    },
]

const ORCH_STATUS: Record<OrchStatus, { label: string; color: string; bg: string }> = {
  PLANNING:          { label: "Planejando",    color: "text-blue-600 dark:text-blue-400",   bg: "bg-blue-100 dark:bg-blue-900/40"   },
  CREATING_SUBTASKS: { label: "Criando",       color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-100 dark:bg-indigo-900/40" },
  ASSIGNING_AGENTS:  { label: "Atribuindo",    color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-100 dark:bg-violet-900/40" },
  EXECUTING:         { label: "Executando",    color: "text-blue-600 dark:text-blue-400",   bg: "bg-blue-100 dark:bg-blue-900/40"   },
  REVIEWING:         { label: "Revisando",     color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-900/40" },
  COMPLETED:         { label: "Concluído",     color: "text-green-600 dark:text-green-400", bg: "bg-green-100 dark:bg-green-900/40" },
  FAILED:            { label: "Falhou",        color: "text-red-600 dark:text-red-400",     bg: "bg-red-100 dark:bg-red-900/40"     },
}

const AGENT_ICONS: Partial<Record<AgentRole, string>> = {
  MAESTRO: "🎯", SENTINEL: "🛡️", ARCHITECTON: "🏗️", PIXEL: "🎨",
}

// ============================================================================
// HELPERS
// ============================================================================

function inferRole(name?: string | null): AgentRole | null {
  if (!name) return null
  const u = name.toUpperCase()
  if (u.includes("MAESTRO"))     return "MAESTRO"
  if (u.includes("SENTINEL"))    return "SENTINEL"
  if (u.includes("ARCHITECTON")) return "ARCHITECTON"
  if (u.includes("PIXEL"))       return "PIXEL"
  return null
}

function fmtElapsed(startIso: string, endIso?: string | null): string {
  const start = new Date(startIso).getTime()
  const end   = endIso ? new Date(endIso).getTime() : Date.now()
  const secs  = Math.floor((end - start) / 1000)
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`
  if (m > 0) return `${m}m ${s.toString().padStart(2, "0")}s`
  return `${s}s`
}

function computeLevels(subtasks: SubtaskData[]): Map<string, number> {
  const levels = new Map<string, number>()
  const depMap = new Map(subtasks.map(t => [t.id, t.dependsOn.map(d => d.id)]))
  let changed = true
  while (changed) {
    changed = false
    for (const task of subtasks) {
      const deps = depMap.get(task.id) ?? []
      const level = deps.reduce((max, depId) => Math.max(max, (levels.get(depId) ?? 0) + 1), 0)
      if (levels.get(task.id) !== level) {
        levels.set(task.id, level)
        changed = true
      }
    }
  }
  return levels
}

function stepIndex(status: OrchStatus): number {
  if (status === "FAILED") return -1
  const idx = PIPELINE_STEPS.findIndex(s => s.key === status)
  return idx >= 0 ? idx : 0
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-1.5 w-full rounded-full bg-muted overflow-hidden", className)}>
      <div
        className="h-full rounded-full bg-blue-500 dark:bg-blue-400 transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}

function OrchStatusBadge({ status }: { status: OrchStatus }) {
  const cfg = ORCH_STATUS[status]
  const isActive = !["COMPLETED", "FAILED"].includes(status)
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", cfg.bg, cfg.color)}>
      {isActive && status !== "REVIEWING" && (
        <span className="relative flex h-1.5 w-1.5">
          <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", cfg.color.replace("text-", "bg-"))} />
          <span className={cn("relative inline-flex rounded-full h-1.5 w-1.5", cfg.color.replace("text-", "bg-"))} />
        </span>
      )}
      {status === "COMPLETED" && <CheckCircle2 className="h-3 w-3" />}
      {status === "FAILED"    && <AlertTriangle className="h-3 w-3" />}
      {status === "REVIEWING" && <RefreshCw className="h-3 w-3 animate-spin" />}
      {cfg.label}
    </span>
  )
}

// --------------------------------------------------------------------------
// Pipeline progress bar
// --------------------------------------------------------------------------
function PipelineBar({ status }: { status: OrchStatus }) {
  const current = stepIndex(status)
  const failed  = status === "FAILED"

  return (
    <div className="flex items-center gap-0 w-full overflow-x-auto pb-1 min-w-0">
      {PIPELINE_STEPS.map((step, i) => {
        const done    = !failed && i < current
        const active  = !failed && i === current
        const pending = failed ? true : i > current

        return (
          <div key={step.key} className="flex items-center min-w-0 flex-1">
            {/* Step node */}
            <div className="flex flex-col items-center gap-1 min-w-0 px-1">
              <div className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold transition-all shrink-0",
                done    && "border-green-500 bg-green-500 text-white",
                active  && "border-blue-500 bg-blue-500 text-white ring-4 ring-blue-500/20",
                failed && i === current && "border-red-500 bg-red-500 text-white",
                pending && "border-muted-foreground/30 bg-muted text-muted-foreground/50",
              )}>
                {done   ? <CheckCircle2 className="h-3.5 w-3.5" /> : (
                  active ? (
                    failed ? <X className="h-3.5 w-3.5" /> : <Zap className="h-3.5 w-3.5" />
                  ) : (
                    <span className="text-[10px]">{i + 1}</span>
                  )
                )}
              </div>
              <span className={cn(
                "text-[10px] font-medium whitespace-nowrap",
                done   && "text-green-600 dark:text-green-400",
                active && !failed && "text-blue-600 dark:text-blue-400",
                failed && i <= current && "text-red-500 dark:text-red-400",
                pending && "text-muted-foreground/50",
              )}>
                {step.short}
              </span>
            </div>

            {/* Connector line (not after last) */}
            {i < PIPELINE_STEPS.length - 1 && (
              <div className={cn(
                "h-0.5 flex-1 mx-1 rounded transition-all",
                done ? "bg-green-500 dark:bg-green-400" : "bg-muted-foreground/20",
              )} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// (DependencyGraph moved to ./DependencyGraph.tsx — uses React Flow)

// --------------------------------------------------------------------------
// Single subtask row
// --------------------------------------------------------------------------
function SubtaskRow({
  subtask,
  onClick,
}: {
  subtask: SubtaskData
  onClick?: () => void
}) {
  const exec   = subtask.executions[0]
  const role   = inferRole(subtask.agentName)
  const icon   = role ? (AGENT_ICONS[role] ?? "🤖") : "🤖"
  const status = subtask.status

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left flex items-start gap-3 rounded-lg border p-3",
        "hover:bg-muted/50 transition-colors group",
        status === "IN_PROGRESS" && "border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-900/10",
        status === "DONE"        && "border-green-200/60 dark:border-green-900 opacity-80",
        status === "BLOCKED"     && "border-red-200 dark:border-red-900 bg-red-50/20 dark:bg-red-900/10",
        status === "TODO"        && !subtask.isBlocked && !subtask.isReady && "border-transparent",
        status === "TODO"        && subtask.isReady    && "border-blue-200/60 dark:border-blue-900",
        status === "REVIEW"      && "border-amber-200 dark:border-amber-900 bg-amber-50/20 dark:bg-amber-900/10",
      )}
    >
      {/* Status icon */}
      <div className="mt-0.5 shrink-0">
        {status === "DONE"        && <CheckCircle2 className="h-4 w-4 text-green-500" />}
        {status === "IN_PROGRESS" && <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />}
        {status === "BLOCKED"     && <AlertTriangle className="h-4 w-4 text-red-400" />}
        {status === "REVIEW"      && <RefreshCw className="h-4 w-4 text-amber-500" />}
        {status === "TODO"        && (subtask.isReady
          ? <Circle className="h-4 w-4 text-blue-400" />
          : <Circle className="h-4 w-4 text-muted-foreground/40" />
        )}
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        {/* Title row */}
        <div className="flex items-start justify-between gap-2">
          <span className={cn(
            "text-sm font-medium leading-tight",
            status === "DONE"    && "line-through text-muted-foreground",
            status === "BLOCKED" && "text-red-600 dark:text-red-400",
          )}>
            {subtask.title}
          </span>
          <Badge variant="secondary" className={cn("text-[10px] shrink-0", STATUS_COLORS[status].soft)}>
            {status === "TODO"        ? "A fazer" :
             status === "IN_PROGRESS" ? "Em progresso" :
             status === "DONE"        ? "Concluído" :
             status === "BLOCKED"     ? "Bloqueado" : "Em revisão"}
          </Badge>
        </div>

        {/* Agent + meta row */}
        <div className="flex items-center gap-2 flex-wrap">
          {subtask.agentName && (
            <span className={cn(
              "inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded",
              role ? ROLE_COLORS[role].monitor : "bg-muted text-muted-foreground"
            )}>
              {icon} {subtask.agentName}
            </span>
          )}
          {subtask.estimatedHours && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Clock className="h-3 w-3" /> {subtask.estimatedHours}h est.
            </span>
          )}
          {subtask.isBlocked && subtask.dependsOn.length > 0 && (
            <span className="text-[10px] text-red-500 dark:text-red-400">
              Aguarda: {subtask.dependsOn.filter(d => d.status !== "DONE").map(d => d.title).join(", ").slice(0, 40)}
            </span>
          )}
        </div>

        {/* Progress bar for running */}
        {status === "IN_PROGRESS" && exec && (
          <div className="space-y-0.5">
            <ProgressBar value={exec.progress} />
            <span className="text-[10px] text-blue-500 dark:text-blue-400">{exec.progress}% concluído</span>
          </div>
        )}
      </div>
    </button>
  )
}

// --------------------------------------------------------------------------
// Phase section (collapsible group of subtasks)
// --------------------------------------------------------------------------
function PhaseSection({
  name,
  subtasks,
  defaultOpen = true,
  onTaskClick,
}: {
  name: string
  subtasks: SubtaskData[]
  defaultOpen?: boolean
  onTaskClick?: (id: string) => void
}) {
  const [open, setOpen] = useState(defaultOpen)
  const done    = subtasks.filter(t => t.status === "DONE").length
  const running = subtasks.filter(t => t.status === "IN_PROGRESS").length
  const total   = subtasks.length
  const pct     = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        {open ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> :
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
        <span className="font-medium text-sm flex-1 text-left">{name}</span>
        <div className="flex items-center gap-2 shrink-0">
          {running > 0 && (
            <span className="flex items-center gap-1 text-xs text-blue-500 dark:text-blue-400">
              <Loader2 className="h-3 w-3 animate-spin" /> {running} rodando
            </span>
          )}
          <span className="text-xs text-muted-foreground">{done}/{total}</span>
          <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-green-500 dark:bg-green-400 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </button>

      {open && (
        <div className="p-2 space-y-1.5">
          {subtasks.map(task => (
            <SubtaskRow
              key={task.id}
              subtask={task}
              onClick={() => onTaskClick?.(task.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// --------------------------------------------------------------------------
// Event timeline (derived from subtask states)
// --------------------------------------------------------------------------
interface TimelineEvent {
  id: string
  time: string
  type: "start" | "complete" | "fail" | "block" | "running" | "review"
  title: string
  agent?: string
}

function buildTimeline(subtasks: SubtaskData[]): TimelineEvent[] {
  const events: TimelineEvent[] = []

  for (const task of subtasks) {
    const exec = task.executions[0]

    if (exec?.startedAt) {
      events.push({
        id: `start-${task.id}`,
        time: exec.startedAt,
        type: exec.status === "RUNNING" ? "running" : "start",
        title: task.title,
        agent: task.agentName ?? undefined,
      })
    }
    if (task.status === "DONE" && task.completedAt) {
      events.push({
        id: `done-${task.id}`,
        time: task.completedAt,
        type: "complete",
        title: task.title,
        agent: task.agentName ?? undefined,
      })
    }
    if (task.status === "BLOCKED") {
      events.push({
        id: `blocked-${task.id}`,
        time: task.createdAt,
        type: "block",
        title: task.title,
        agent: task.agentName ?? undefined,
      })
    }
    if (task.status === "REVIEW") {
      events.push({
        id: `review-${task.id}`,
        time: task.createdAt,
        type: "review",
        title: task.title,
        agent: task.agentName ?? undefined,
      })
    }
    if (exec?.status === "FAILED") {
      events.push({
        id: `fail-${task.id}`,
        time: exec.completedAt ?? task.createdAt,
        type: "fail",
        title: task.title,
        agent: task.agentName ?? undefined,
      })
    }
  }

  return events.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 20)
}

function EventTimeline({ subtasks }: { subtasks: SubtaskData[] }) {
  const events = buildTimeline(subtasks)

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground text-sm">
        <Terminal className="h-4 w-4" />
        Aguardando eventos de execução…
      </div>
    )
  }

  const cfg: Record<TimelineEvent["type"], { icon: React.ReactNode; color: string; label: string }> = {
    running:  { icon: <Loader2 className="h-3 w-3 animate-spin" />, color: "text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800",   label: "Executando" },
    start:    { icon: <Play className="h-3 w-3" />,                 color: "text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800", label: "Iniciado"  },
    complete: { icon: <CheckCircle2 className="h-3 w-3" />,         color: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800",   label: "Concluído"  },
    fail:     { icon: <X className="h-3 w-3" />,                    color: "text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800",               label: "Falhou"    },
    block:    { icon: <AlertTriangle className="h-3 w-3" />,        color: "text-amber-500 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800",  label: "Bloqueado" },
    review:   { icon: <RefreshCw className="h-3 w-3" />,            color: "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800", label: "Revisão" },
  }

  return (
    <div className="space-y-1 font-mono text-xs">
      {events.map(ev => {
        const c = cfg[ev.type]
        const role = inferRole(ev.agent)
        return (
          <div key={ev.id} className={cn(
            "flex items-start gap-2 rounded px-2.5 py-1.5 border",
            c.color
          )}>
            <span className="mt-px shrink-0">{c.icon}</span>
            <span className="shrink-0 opacity-60">
              {new Date(ev.time).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
            <span className="font-medium opacity-70 shrink-0">[{c.label}]</span>
            <span className="truncate">
              {ev.agent && (
                <span className={cn("mr-1", role ? ROLE_COLORS[role].monitor.split(" ")[0] : "")}>
                  {ev.agent}:
                </span>
              )}
              {ev.title}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export interface OrchestrationViewProps {
  orchestrationId: string
}

export function OrchestrationView({ orchestrationId }: OrchestrationViewProps) {
  const [data,    setData]    = useState<OrchestrationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [acting,  setActing]  = useState<string | null>(null) // "pause" | "resume" | "cancel"
  const [activeTab, setActiveTab] = useState<"graph" | "list" | "logs">("list")
  const [now,     setNow]     = useState(() => Date.now())
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/orchestrate/${orchestrationId}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error ?? "Erro desconhecido")
      setData(json.data as OrchestrationData)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [orchestrationId])

  // Initial fetch + polling
  useEffect(() => {
    fetchData()
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [fetchData])

  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    if (!data) return
    const done = ["COMPLETED", "FAILED"].includes(data.status)
    if (!done) {
      pollRef.current = setInterval(fetchData, 3000)
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [data?.status, fetchData]) // eslint-disable-line react-hooks/exhaustive-deps

  const sendAction = useCallback(async (action: "pause" | "resume" | "cancel" | "monitor") => {
    setActing(action)
    try {
      const res = await fetch(`/api/orchestrate/${orchestrationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      await fetchData()
    } catch (e) {
      console.error("[OrchestrationView]", e)
    } finally {
      setActing(null)
    }
  }, [orchestrationId, fetchData])

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Carregando orquestração…</span>
      </div>
    )
  }

  if (error || !data) {
    return (
      <Card className="border-red-200 dark:border-red-900">
        <CardContent className="flex items-center gap-3 py-6 text-red-600 dark:text-red-400">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span className="text-sm">{error ?? "Orquestração não encontrada"}</span>
          <Button variant="outline" size="sm" onClick={fetchData} className="ml-auto">
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Tentar novamente
          </Button>
        </CardContent>
      </Card>
    )
  }

  const isActive    = !["COMPLETED", "FAILED"].includes(data.status)
  const isExecuting = data.status === "EXECUTING"
  const isPaused    = data.subtasks.some(t => t.executions[0]?.status === "PAUSED")
  const canPause    = isActive
  const canCancel   = isActive

  // Build phases from plan, or fall back to a single "Subtarefas" group
  const planPhases = data.plan?.phases ?? []
  const phaseGroups: { name: string; subtasks: SubtaskData[] }[] = []

  if (planPhases.length > 0) {
    for (const phase of planPhases) {
      const phaseTitles = new Set(phase.subtasks.map(s => s.title))
      const phaseTasks = data.subtasks.filter(t => phaseTitles.has(t.title))
      if (phaseTasks.length > 0) phaseGroups.push({ name: phase.name, subtasks: phaseTasks })
    }
    // catch tasks not in any plan phase (review tasks, etc.)
    const inPhase = new Set(phaseGroups.flatMap(g => g.subtasks.map(t => t.id)))
    const orphans = data.subtasks.filter(t => !inPhase.has(t.id))
    if (orphans.length > 0) phaseGroups.push({ name: "Outros", subtasks: orphans })
  } else {
    phaseGroups.push({ name: "Subtarefas", subtasks: data.subtasks })
  }

  const runningTasks = data.subtasks.filter(t => t.status === "IN_PROGRESS")
  const elapsedStr   = fmtElapsed(data.createdAt, data.completedAt)

  return (
    <div className="space-y-4">

      {/* ── A: HEADER ──────────────────────────────────────────────────────── */}
      <Card>
        <CardContent className="pt-5 pb-4 space-y-3">
          {/* Title + status row */}
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <GitMerge className="h-4 w-4 text-muted-foreground shrink-0" />
                <h2 className="text-base font-semibold leading-tight truncate">
                  {data.parentTask.title}
                </h2>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <OrchStatusBadge status={data.status} />
                {data.currentPhase && (
                  <span className="text-xs text-muted-foreground truncate max-w-[280px]">
                    {data.currentPhase}
                  </span>
                )}
              </div>
            </div>

            {/* Meta: progress + elapsed */}
            <div className="flex items-center gap-4 shrink-0 text-sm">
              <div className="text-center">
                <div className="font-semibold tabular-nums">
                  {data.progress.done}<span className="text-muted-foreground font-normal">/{data.progress.total}</span>
                </div>
                <div className="text-[10px] text-muted-foreground">subtarefas</div>
              </div>
              <div className="text-center">
                <div className="font-semibold tabular-nums text-blue-600 dark:text-blue-400">
                  {data.progress.percent}%
                </div>
                <div className="text-[10px] text-muted-foreground">progresso</div>
              </div>
              <div className="text-center">
                <div className="font-semibold tabular-nums flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  {elapsedStr}
                </div>
                <div className="text-[10px] text-muted-foreground">decorrido</div>
              </div>
            </div>
          </div>

          {/* Overall progress bar */}
          <div className="space-y-1">
            <ProgressBar value={data.progress.percent} className="h-2" />
            {data.progress.inProgress > 0 && (
              <p className="text-xs text-blue-500 dark:text-blue-400 flex items-center gap-1">
                <Activity className="h-3 w-3" />
                {data.progress.inProgress} subtarefa{data.progress.inProgress > 1 ? "s" : ""} em execução agora
              </p>
            )}
          </div>

          {/* Running tasks indicator */}
          {runningTasks.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {runningTasks.map(task => {
                const role = inferRole(task.agentName)
                return (
                  <span key={task.id} className={cn(
                    "inline-flex items-center gap-1 text-[10px] rounded-full px-2 py-0.5",
                    role ? ROLE_COLORS[role].monitor : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                  )}>
                    <Loader2 className="h-2.5 w-2.5 animate-spin" />
                    {task.agentName}: {task.title.slice(0, 30)}{task.title.length > 30 ? "…" : ""}
                  </span>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── B: PIPELINE BAR ───────────────────────────────────────────────── */}
      <Card>
        <CardContent className="py-4">
          <PipelineBar status={data.status} />
        </CardContent>
      </Card>

      {/* ── C/D/E: TABS (Graph / Subtasks / Logs) ─────────────────────────── */}
      <Card>
        <CardHeader className="pb-0 pt-4 px-4">
          <div className="flex items-center gap-1 border-b pb-0">
            {(["list", "graph", "logs"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                  activeTab === tab
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/40"
                )}
              >
                {tab === "list"  && <><List className="h-3.5 w-3.5" /> Subtarefas</>}
                {tab === "graph" && <><GitMerge className="h-3.5 w-3.5" /> Grafo</>}
                {tab === "logs"  && <><Terminal className="h-3.5 w-3.5" /> Logs</>}
              </button>
            ))}
            <div className="ml-auto pb-2">
              <Button
                variant="ghost" size="sm"
                onClick={fetchData}
                className="h-7 text-xs text-muted-foreground"
              >
                <RefreshCw className="h-3 w-3 mr-1" /> Atualizar
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4 pb-4 px-4">
          {/* D: Subtask list by phase */}
          {activeTab === "list" && (
            <div className="space-y-3">
              {phaseGroups.map((group, i) => (
                <PhaseSection
                  key={group.name}
                  name={group.name}
                  subtasks={group.subtasks}
                  defaultOpen={i === 0 || group.subtasks.some(t => t.status === "IN_PROGRESS")}
                  onTaskClick={id => window.open(`/tasks/${id}`, "_blank")}
                />
              ))}
              {data.subtasks.length === 0 && (
                <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" /> Criando subtarefas…
                </div>
              )}
            </div>
          )}

          {/* C: Dependency graph (React Flow) */}
          {activeTab === "graph" && (
            <DependencyGraph
              subtasks={data.subtasks}
              onNodeClick={id => window.open(`/tasks/${id}`, "_blank")}
            />
          )}

          {/* E: Event logs */}
          {activeTab === "logs" && (
            <div className="space-y-2">
              <EventTimeline subtasks={data.subtasks} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── F: CONTROLS ───────────────────────────────────────────────────── */}
      <Card>
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground mr-1">Controles:</span>

            {/* Pausar / Retomar */}
            {canPause && !isPaused && isExecuting && (
              <Button
                variant="outline" size="sm"
                disabled={!!acting}
                onClick={() => sendAction("pause")}
                className="gap-1.5"
              >
                {acting === "pause" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Pause className="h-3.5 w-3.5" />}
                Pausar
              </Button>
            )}
            {canPause && isPaused && (
              <Button
                variant="outline" size="sm"
                disabled={!!acting}
                onClick={() => sendAction("resume")}
                className="gap-1.5 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/30"
              >
                {acting === "resume" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                Retomar
              </Button>
            )}

            {/* Monitor */}
            {isActive && (
              <Button
                variant="outline" size="sm"
                disabled={!!acting}
                onClick={() => sendAction("monitor")}
                className="gap-1.5"
              >
                {acting === "monitor" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Activity className="h-3.5 w-3.5" />}
                Monitorar
              </Button>
            )}

            {/* Cancelar */}
            {canCancel && (
              <Button
                variant="outline" size="sm"
                disabled={!!acting}
                onClick={() => {
                  if (confirm("Cancelar esta orquestração? Esta ação não pode ser desfeita.")) {
                    sendAction("cancel")
                  }
                }}
                className="gap-1.5 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/30"
              >
                {acting === "cancel" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                Cancelar
              </Button>
            )}

            {/* Ver Resultado */}
            {data.status === "COMPLETED" && (
              <Button
                variant="default" size="sm"
                onClick={() => window.open(`/tasks/${data.parentTask.id}`, "_blank")}
                className="gap-1.5 ml-auto"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Ver Resultado
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}

            {/* Refresh manual indicator */}
            {isActive && (
              <span className="ml-auto text-[10px] text-muted-foreground flex items-center gap-1">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500" />
                </span>
                Auto-refresh a cada 3s
              </span>
            )}
          </div>
        </CardContent>
      </Card>

    </div>
  )
}
