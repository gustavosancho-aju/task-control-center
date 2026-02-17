import { toast } from "sonner"

const DURATION = 4000

const STATUS_LABELS: Record<string, string> = {
  TODO: "A Fazer",
  IN_PROGRESS: "Em Progresso",
  REVIEW: "Em Revisão",
  DONE: "Concluído",
  BLOCKED: "Bloqueado",
}

// Base notifications

export function notifySuccess(message: string, description?: string) {
  toast.success(message, { description, duration: DURATION })
}

export function notifyError(message: string, description?: string) {
  toast.error(message, { description, duration: DURATION })
}

export function notifyWarning(message: string, description?: string) {
  toast.warning(message, { description, duration: DURATION })
}

export function notifyInfo(message: string, description?: string) {
  toast.info(message, { description, duration: DURATION })
}

// Domain notifications

export function notifyTaskCreated(taskTitle: string) {
  toast.success("Tarefa criada", {
    description: taskTitle,
    duration: DURATION,
  })
}

export function notifyTaskCompleted(taskTitle: string) {
  toast.success("Tarefa concluída", {
    description: taskTitle,
    duration: DURATION,
  })
}

export function notifyTaskAssigned(taskTitle: string, agentName: string) {
  toast.success("Agente atribuído", {
    description: `${agentName} foi atribuído a "${taskTitle}"`,
    duration: DURATION,
  })
}

export function notifyStatusChanged(taskTitle: string, from: string, to: string) {
  const fromLabel = STATUS_LABELS[from] ?? from
  const toLabel = STATUS_LABELS[to] ?? to
  toast.info("Status atualizado", {
    description: `"${taskTitle}" movida de ${fromLabel} para ${toLabel}`,
    duration: DURATION,
  })
}

export function notifyAIAnalysis(agentSuggested: string) {
  toast.info("Análise de IA concluída", {
    description: `Agente sugerido: ${agentSuggested}`,
    duration: DURATION,
  })
}
