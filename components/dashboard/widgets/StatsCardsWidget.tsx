"use client"

import { useMemo } from "react"
import {
  CheckCircle,
  Clock,
  AlertCircle,
  Users,
  TrendingUp,
  ListTodo,
  BarChart3,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { DashboardWidget } from "../DashboardWidget"
import type { DashboardData, WidgetSize } from "@/types/dashboard"

interface Props {
  data: DashboardData
  size: WidgetSize
  isEditing?: boolean
  onRemove?: () => void
}

export function StatsCardsWidget({ data, size, isEditing, onRemove }: Props) {
  const stats = useMemo(() => {
    const { tasks } = data
    const total = tasks.length
    const todo = tasks.filter((t) => t.status === "TODO").length
    const inProgress = tasks.filter((t) => t.status === "IN_PROGRESS").length
    const done = tasks.filter((t) => t.status === "DONE").length
    const blocked = tasks.filter((t) => t.status === "BLOCKED").length
    const noAgent = tasks.filter((t) => !t.agentId).length
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0
    return { total, todo, inProgress, done, blocked, noAgent, completionRate }
  }, [data.tasks])

  const cards = [
    { label: "Total", value: stats.total, icon: ListTodo, color: "text-foreground", bg: "bg-muted" },
    { label: "A Fazer", value: stats.todo, icon: Clock, color: "text-muted-foreground", bg: "bg-muted" },
    { label: "Em Progresso", value: stats.inProgress, icon: Clock, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20" },
    { label: "Concluídas", value: stats.done, icon: CheckCircle, color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-900/20" },
    { label: "Bloqueadas", value: stats.blocked, icon: AlertCircle, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/20" },
    { label: "Sem Agente", value: stats.noAgent, icon: Users, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-900/20" },
    { label: "Conclusão", value: `${stats.completionRate}%`, icon: TrendingUp, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
  ]

  return (
    <DashboardWidget
      title="Métricas"
      icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />}
      size={size}
      isEditing={isEditing}
      onRemove={onRemove}
    >
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {cards.map((s) => (
          <div key={s.label} className="flex items-center gap-2.5 rounded-lg border p-2.5">
            <div className={cn("flex items-center justify-center h-8 w-8 rounded-md shrink-0", s.bg)}>
              <s.icon className={cn("h-4 w-4", s.color)} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground truncate">{s.label}</p>
              <p className={cn("text-lg font-bold leading-tight", s.color)}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>
    </DashboardWidget>
  )
}
