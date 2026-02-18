"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  FileText,
  Zap,
  Clock,
  Users,
  ChevronRight,
  CheckCircle2,
  Loader2,
  AlertCircle,
  X,
} from "lucide-react"
import { Header } from "@/components/layout/Header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { TaskCreationForm } from "@/components/tasks/TaskCreationForm"
import type { TaskFormData } from "@/components/tasks/TaskCreationForm"
import { TemplatePicker } from "@/components/templates/TemplatePicker"
import { notifyTaskCreated, notifyError } from "@/lib/notifications"
import { useCreateTask } from "@/lib/hooks/use-tasks"

// ─── Types ───────────────────────────────────────────────────────────────────

interface SubtaskPlan {
  title: string
  description: string
  agent: "MAESTRO" | "SENTINEL" | "ARCHITECTON" | "PIXEL"
  estimatedHours: number
  priority: string
  dependsOn: string[]
}

interface Phase {
  name: string
  subtasks: SubtaskPlan[]
}

interface OrchestrationPlan {
  analysis: string
  phases: Phase[]
  estimatedTotalHours: number
  recommendedOrder: string[]
}

interface PlanPreviewData {
  plan: OrchestrationPlan
  stats: {
    totalPhases: number
    totalSubtasks: number
    agentsUsed: string[]
    estimatedTotalHours: number
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const AGENT_COLORS: Record<string, string> = {
  MAESTRO: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  SENTINEL: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  ARCHITECTON: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  PIXEL: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
}

const AGENT_EMOJI: Record<string, string> = {
  MAESTRO: "🎯",
  SENTINEL: "🛡️",
  ARCHITECTON: "🏗️",
  PIXEL: "🎨",
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-600",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-orange-100 text-orange-700",
  URGENT: "bg-red-100 text-red-700",
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function AgentChip({ agent }: { agent: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${AGENT_COLORS[agent] ?? "bg-muted text-muted-foreground"}`}>
      <span>{AGENT_EMOJI[agent] ?? "🤖"}</span>
      {agent}
    </span>
  )
}

function PhaseCard({ phase, phaseIndex }: { phase: Phase; phaseIndex: number }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold flex-shrink-0">
          {phaseIndex + 1}
        </div>
        <h4 className="text-sm font-semibold text-foreground">{phase.name}</h4>
        <span className="text-xs text-muted-foreground">
          ({phase.subtasks.length} subtarefa{phase.subtasks.length !== 1 ? "s" : ""})
        </span>
      </div>
      <div className="ml-7 space-y-1.5">
        {phase.subtasks.map((subtask, idx) => (
          <div
            key={idx}
            className="flex items-start gap-2 rounded-md border bg-muted/30 p-2.5"
          >
            <CheckCircle2 className="h-4 w-4 text-muted-foreground/50 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium truncate">{subtask.title}</span>
                <AgentChip agent={subtask.agent} />
                <Badge
                  variant="secondary"
                  className={`text-xs ${PRIORITY_COLORS[subtask.priority] ?? ""}`}
                >
                  {subtask.priority}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {subtask.estimatedHours}h
                </span>
                {subtask.dependsOn.length > 0 && (
                  <span className="truncate">
                    Depende de: {subtask.dependsOn.join(", ")}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PlanPreviewModal({
  open,
  onClose,
  preview,
  loading,
  error,
  onExecute,
  executing,
}: {
  open: boolean
  onClose: () => void
  preview: PlanPreviewData | null
  loading: boolean
  error: string | null
  onExecute: () => void
  executing: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Preview do Plano Maestro
          </DialogTitle>
          <DialogDescription>
            Veja o que o Maestro vai criar antes de confirmar a execução
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {/* Loading state */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Consultando Maestro para gerar o plano...
              </p>
            </div>
          )}

          {/* Error state */}
          {error && !loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <p className="text-sm text-destructive text-center">{error}</p>
              <Button variant="outline" size="sm" onClick={onClose}>
                Fechar
              </Button>
            </div>
          )}

          {/* Plan content */}
          {preview && !loading && !error && (
            <div className="space-y-5 py-2">
              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border bg-muted/30 p-3 text-center space-y-1">
                  <p className="text-2xl font-bold text-foreground">
                    {preview.stats.totalSubtasks}
                  </p>
                  <p className="text-xs text-muted-foreground">Subtarefas</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3 text-center space-y-1">
                  <p className="text-2xl font-bold text-foreground">
                    {preview.stats.estimatedTotalHours}h
                  </p>
                  <p className="text-xs text-muted-foreground">Estimativa total</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3 text-center space-y-1">
                  <p className="text-2xl font-bold text-foreground">
                    {preview.stats.totalPhases}
                  </p>
                  <p className="text-xs text-muted-foreground">Fases</p>
                </div>
              </div>

              {/* Agents used */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" /> Agentes:
                </span>
                {preview.stats.agentsUsed.map((agent) => (
                  <AgentChip key={agent} agent={agent} />
                ))}
              </div>

              {/* Analysis */}
              {preview.plan.analysis && (
                <div className="rounded-lg border border-dashed p-3 bg-muted/20">
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Análise do Maestro
                  </p>
                  <p className="text-sm leading-relaxed">{preview.plan.analysis}</p>
                </div>
              )}

              {/* Phases */}
              <div className="space-y-4">
                {preview.plan.phases.map((phase, idx) => (
                  <PhaseCard key={idx} phase={phase} phaseIndex={idx} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {preview && !loading && !error && (
          <div className="flex items-center justify-between gap-3 pt-4 border-t flex-shrink-0">
            <Button variant="ghost" onClick={onClose} disabled={executing}>
              <X className="h-4 w-4 mr-1" />
              Cancelar
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {preview.stats.totalSubtasks} subtarefas · {preview.stats.estimatedTotalHours}h
              </span>
              <Button
                onClick={onExecute}
                disabled={executing}
                className="gap-2"
              >
                {executing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                {executing ? "Iniciando orquestração..." : "Executar este plano"}
                {!executing && <ChevronRight className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── MaestroProgress Modal ────────────────────────────────────────────────────

function MaestroProgressModal({
  open,
  step,
  error,
}: {
  open: boolean
  step: "creating" | "orchestrating" | "redirecting"
  error: string | null
}) {
  const steps = [
    { id: "creating", label: "Criando tarefa..." },
    { id: "orchestrating", label: "Maestro planejando e criando subtarefas..." },
    { id: "redirecting", label: "Redirecionando para o dashboard..." },
  ]
  const currentIdx = steps.findIndex((s) => s.id === step)

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-sm" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Modo Autônomo
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {error ? (
            <div className="flex items-start gap-2 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          ) : (
            steps.map((s, idx) => {
              const isDone = idx < currentIdx
              const isCurrent = idx === currentIdx
              return (
                <div key={s.id} className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {isDone ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : isCurrent ? (
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
                    )}
                  </div>
                  <span
                    className={`text-sm ${
                      isCurrent
                        ? "text-foreground font-medium"
                        : isDone
                        ? "text-muted-foreground line-through"
                        : "text-muted-foreground/50"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
              )
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CreateTaskPage() {
  const router = useRouter()
  const createTask = useCreateTask()

  // Core state
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false)
  const [autonomousMode, setAutonomousMode] = useState(false)

  // Plan preview modal
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewData, setPreviewData] = useState<PlanPreviewData | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  // Cache the form data so "Executar este plano" can use it
  const [pendingFormData, setPendingFormData] = useState<TaskFormData | null>(null)

  // Maestro progress modal
  const [progressOpen, setProgressOpen] = useState(false)
  const [progressStep, setProgressStep] = useState<"creating" | "orchestrating" | "redirecting">("creating")
  const [progressError, setProgressError] = useState<string | null>(null)

  // Quick orchestrate (single-request)
  const [quickOrchestrateLoading, setQuickOrchestrateLoading] = useState(false)

  // ── Helpers ────────────────────────────────────────────────────────────────

  const orchestrateTask = async (taskId: string): Promise<string> => {
    const res = await fetch("/api/orchestrate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, autoExecute: true }),
    })
    const data = await res.json()
    if (!data.success) throw new Error(data.error ?? "Falha ao iniciar orquestração")
    return data.data.orchestrationId as string
  }

  // ── handleSubmit (normal flow, with optional autonomous mode) ──────────────

  const handleSubmit = async (task: TaskFormData) => {
    try {
      const created = await createTask.mutateAsync(task as never)
      notifyTaskCreated(task.title)

      if (autonomousMode) {
        setProgressOpen(true)
        setProgressStep("orchestrating")
        setProgressError(null)
        try {
          const orchestrationId = await orchestrateTask(created.id)
          setProgressStep("redirecting")
          setTimeout(() => router.push(`/orchestration/${orchestrationId}`), 400)
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          setProgressError(msg)
        }
      } else {
        router.push("/")
      }
    } catch {
      notifyError("Erro ao criar tarefa", "Falha na conexão com o servidor")
    }
  }

  // ── handleMaestroExecute (button "Executar com Maestro") ──────────────────

  const handleMaestroExecute = async (task: TaskFormData) => {
    setProgressOpen(true)
    setProgressStep("creating")
    setProgressError(null)

    try {
      const created = await createTask.mutateAsync(task as never)
      notifyTaskCreated(task.title)

      setProgressStep("orchestrating")
      const orchestrationId = await orchestrateTask(created.id)

      setProgressStep("redirecting")
      setTimeout(() => router.push(`/orchestration/${orchestrationId}`), 400)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setProgressError(msg)
    }
  }

  // ── handlePreviewPlan ──────────────────────────────────────────────────────

  const handlePreviewPlan = async (title: string, description?: string) => {
    setPreviewOpen(true)
    setPreviewLoading(true)
    setPreviewError(null)
    setPreviewData(null)
    // Save form context so we can execute after preview confirmation
    setPendingFormData({ title, description, priority: "MEDIUM" })

    try {
      const res = await fetch("/api/orchestrate/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error ?? "Erro ao gerar preview")
      setPreviewData(data.data as PlanPreviewData)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setPreviewError(msg)
    } finally {
      setPreviewLoading(false)
    }
  }

  // Execute after preview confirmation
  const handleExecuteFromPreview = async () => {
    if (!pendingFormData) return
    setPreviewOpen(false)
    await handleMaestroExecute(pendingFormData)
  }

  // ── handleQuickOrchestrate (single-request: cria + orquestra) ────────────

  const handleQuickOrchestrate = async (task: TaskFormData) => {
    setQuickOrchestrateLoading(true)
    try {
      const res = await fetch("/api/quick-orchestrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: task.title,
          description: task.description,
          priority: task.priority,
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error ?? "Falha ao criar e orquestrar")
      router.push(data.data.redirectUrl as string)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      notifyError("Erro ao orquestrar", msg)
    } finally {
      setQuickOrchestrateLoading(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-muted/40">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Nova Tarefa</h1>
            <p className="text-muted-foreground">Crie uma nova tarefa para o Agency Dev Squad</p>
          </div>
          <Button
            variant="outline"
            onClick={() => setTemplatePickerOpen(true)}
            className="gap-1.5 flex-shrink-0"
          >
            <FileText className="h-4 w-4" />
            Usar Template
          </Button>
        </div>

        <TaskCreationForm
          onSubmit={handleSubmit}
          onCancel={() => router.push("/")}
          autonomousMode={autonomousMode}
          onToggleAutonomous={setAutonomousMode}
          onMaestroExecute={handleMaestroExecute}
          maestroExecuting={progressOpen && !progressError}
          onPreviewPlan={handlePreviewPlan}
          previewLoading={previewLoading}
          onQuickOrchestrate={handleQuickOrchestrate}
          quickOrchestrateLoading={quickOrchestrateLoading}
        />

        <TemplatePicker
          open={templatePickerOpen}
          onOpenChange={setTemplatePickerOpen}
        />
      </main>

      {/* Plan Preview Modal */}
      <PlanPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        preview={previewData}
        loading={previewLoading}
        error={previewError}
        onExecute={handleExecuteFromPreview}
        executing={progressOpen && !progressError}
      />

      {/* Maestro Progress Modal */}
      <MaestroProgressModal
        open={progressOpen}
        step={progressStep}
        error={progressError}
      />
    </div>
  )
}
