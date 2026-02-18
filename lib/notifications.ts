import { toast } from "sonner"
import { notificationStore } from "@/lib/notification-store"

const DURATION = 4000

const STATUS_LABELS: Record<string, string> = {
  TODO: "A Fazer",
  IN_PROGRESS: "Em Progresso",
  REVIEW: "Em Revisão",
  DONE: "Concluído",
  BLOCKED: "Bloqueado",
}

// ============================================================================
// BASE NOTIFICATIONS
// ============================================================================

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

// ============================================================================
// DOMAIN NOTIFICATIONS — TASKS
// ============================================================================

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

// ============================================================================
// DOMAIN NOTIFICATIONS — ORCHESTRATION
// ============================================================================

/**
 * Chamada quando o Maestro inicia a orquestração de uma tarefa.
 * Aparece como toast efêmero + persiste no NotificationCenter.
 */
export function notifyOrchestrationStarted(
  taskTitle: string,
  totalSubtasks: number,
  orchestrationId?: string
) {
  const description = `Decompondo "${taskTitle}" em ${totalSubtasks} subtarefa${totalSubtasks !== 1 ? 's' : ''}`

  toast.info("🎯 Orquestração iniciada", { description, duration: DURATION })

  notificationStore.add({
    type: 'orchestration',
    title: 'Orquestração iniciada',
    description,
    href: orchestrationId ? `/orchestration/${orchestrationId}` : undefined,
    meta: { taskTitle, totalSubtasks, orchestrationId },
  })
}

/**
 * Chamada quando todas as subtarefas de uma fase são concluídas.
 */
export function notifyPhaseCompleted(
  phaseName: string,
  orchestrationId: string
) {
  const description = `Fase "${phaseName}" concluída — revisão do Sentinel em andamento`

  toast.success("✅ Fase concluída", { description, duration: DURATION })

  notificationStore.add({
    type: 'phase',
    title: `Fase concluída: ${phaseName}`,
    description,
    href: `/orchestration/${orchestrationId}`,
    meta: { phaseName, orchestrationId },
  })
}

/**
 * Chamada quando uma subtarefa individual é concluída.
 * `remaining` = quantas ainda faltam na orquestração.
 */
export function notifySubtaskCompleted(
  subtaskTitle: string,
  remaining: number,
  orchestrationId?: string
) {
  const description = remaining > 0
    ? `"${subtaskTitle}" concluída — ${remaining} restante${remaining !== 1 ? 's' : ''}`
    : `"${subtaskTitle}" foi a última subtarefa!`

  toast.success("Subtarefa concluída", { description, duration: 3000 })

  notificationStore.add({
    type: 'subtask',
    title: 'Subtarefa concluída',
    description,
    href: orchestrationId ? `/orchestration/${orchestrationId}` : undefined,
    meta: { subtaskTitle, remaining, orchestrationId },
  })
}

/**
 * Chamada quando toda a orquestração é finalizada com sucesso.
 * `duration` em ms.
 */
export function notifyOrchestrationCompleted(
  taskTitle: string,
  durationMs: number,
  totalSubtasks: number,
  orchestrationId?: string
) {
  const minutes = Math.round(durationMs / 60_000)
  const timeStr = minutes < 1 ? 'menos de 1 min' : `${minutes} min`
  const description = `"${taskTitle}" — ${totalSubtasks} subtarefa${totalSubtasks !== 1 ? 's' : ''} em ${timeStr}`

  toast.success("🎉 Orquestração concluída!", {
    description,
    duration: 6000,
  })

  notificationStore.add({
    type: 'orchestration',
    title: 'Orquestração concluída!',
    description,
    href: orchestrationId ? `/orchestration/${orchestrationId}` : undefined,
    meta: { taskTitle, durationMs, totalSubtasks, orchestrationId },
  })
}

/**
 * Chamada quando a orquestração falha definitivamente.
 */
export function notifyOrchestrationFailed(
  taskTitle: string,
  error: string,
  completedCount: number,
  totalCount: number,
  orchestrationId?: string
) {
  const description = `"${taskTitle}" falhou após ${completedCount}/${totalCount} subtarefas: ${error}`

  toast.error("❌ Orquestração falhou", { description, duration: 8000 })

  notificationStore.add({
    type: 'error',
    title: 'Orquestração falhou',
    description,
    href: orchestrationId ? `/orchestration/${orchestrationId}` : undefined,
    meta: { taskTitle, error, completedCount, totalCount, orchestrationId },
  })
}

/**
 * Chamada quando uma fase falhou no review do Sentinel e precisa de atenção.
 */
export function notifyReviewNeeded(
  taskTitle: string,
  phase: string,
  orchestrationId?: string
) {
  const description = `Fase "${phase}" de "${taskTitle}" reprovada no review — intervenção necessária`

  toast.warning("⚠️ Revisão necessária", { description, duration: 8000 })

  notificationStore.add({
    type: 'review',
    title: 'Revisão necessária',
    description,
    href: orchestrationId ? `/orchestration/${orchestrationId}` : undefined,
    meta: { taskTitle, phase, orchestrationId },
  })
}
