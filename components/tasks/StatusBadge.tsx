import { Badge } from "@/components/ui/badge"
import { STATUS_COLORS, type TaskStatus } from "@/lib/colors"

const statusLabels: Record<TaskStatus, string> = {
  TODO: "A Fazer",
  IN_PROGRESS: "Em Progresso",
  REVIEW: "Em Revisao",
  DONE: "Concluido",
  BLOCKED: "Bloqueado",
}

const statusVariants: Record<TaskStatus, "secondary" | "default" | "destructive"> = {
  TODO: "secondary",
  IN_PROGRESS: "default",
  REVIEW: "default",
  DONE: "default",
  BLOCKED: "destructive",
}

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <Badge variant={statusVariants[status]} className={STATUS_COLORS[status].badge}>
      {statusLabels[status]}
    </Badge>
  )
}
