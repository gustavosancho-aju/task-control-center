import { Badge } from "@/components/ui/badge"

const priorityConfig = {
  LOW: { label: "Baixa", className: "bg-slate-400 text-white" },
  MEDIUM: { label: "Media", className: "bg-blue-400 text-white" },
  HIGH: { label: "Alta", className: "bg-orange-500 text-white" },
  URGENT: { label: "Urgente", className: "bg-red-600 text-white" },
}

type TaskPriority = keyof typeof priorityConfig

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const config = priorityConfig[priority]
  return (
    <Badge className={config.className}>
      {config.label}
    </Badge>
  )
}
