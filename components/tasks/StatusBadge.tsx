import { Badge } from "@/components/ui/badge"

const statusConfig = {
  TODO: { label: "A Fazer", variant: "secondary" as const, className: "bg-slate-500" },
  IN_PROGRESS: { label: "Em Progresso", variant: "default" as const, className: "bg-blue-500" },
  REVIEW: { label: "Em Revisao", variant: "default" as const, className: "bg-yellow-500" },
  DONE: { label: "Concluido", variant: "default" as const, className: "bg-green-500" },
  BLOCKED: { label: "Bloqueado", variant: "destructive" as const, className: "bg-red-500" },
}

type TaskStatus = keyof typeof statusConfig

export function StatusBadge({ status }: { status: TaskStatus }) {
  const config = statusConfig[status]
  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  )
}
