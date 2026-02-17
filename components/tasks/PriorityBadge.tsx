import { Badge } from "@/components/ui/badge"
import { PRIORITY_COLORS, type TaskPriority } from "@/lib/colors"

const priorityLabels: Record<TaskPriority, string> = {
  LOW: "Baixa",
  MEDIUM: "Media",
  HIGH: "Alta",
  URGENT: "Urgente",
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <Badge className={PRIORITY_COLORS[priority].badge}>
      {priorityLabels[priority]}
    </Badge>
  )
}
