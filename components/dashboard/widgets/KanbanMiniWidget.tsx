"use client"

import { useMemo } from "react"
import Link from "next/link"
import {
  Columns3,
  ExternalLink,
  ListTodo,
  Clock,
  Eye,
  CheckCircle,
  AlertCircle,
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

const COLUMNS = [
  { status: "TODO", label: "A Fazer", icon: ListTodo, color: "text-slate-600 dark:text-slate-400", bg: "bg-slate-100 dark:bg-slate-800", bar: "bg-slate-400" },
  { status: "IN_PROGRESS", label: "Em Progresso", icon: Clock, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20", bar: "bg-blue-500" },
  { status: "REVIEW", label: "Revisão", icon: Eye, color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-50 dark:bg-yellow-900/20", bar: "bg-yellow-500" },
  { status: "DONE", label: "Concluído", icon: CheckCircle, color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-900/20", bar: "bg-green-500" },
  { status: "BLOCKED", label: "Bloqueado", icon: AlertCircle, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/20", bar: "bg-red-500" },
] as const

export function KanbanMiniWidget({ data, size, isEditing, onRemove }: Props) {
  const counts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const t of data.tasks) {
      map[t.status] = (map[t.status] || 0) + 1
    }
    return map
  }, [data.tasks])

  const total = data.tasks.length || 1

  return (
    <DashboardWidget
      title="Kanban Compacto"
      icon={<Columns3 className="h-4 w-4 text-muted-foreground" />}
      size={size}
      isEditing={isEditing}
      onRemove={onRemove}
      actions={
        <Link href="/kanban" className="text-xs text-primary hover:underline flex items-center gap-1">
          Abrir Kanban <ExternalLink className="h-3 w-3" />
        </Link>
      }
    >
      <div className="grid grid-cols-5 gap-3">
        {COLUMNS.map((col) => {
          const count = counts[col.status] || 0
          const pct = Math.round((count / total) * 100)
          return (
            <div key={col.status} className={cn("rounded-lg p-3 text-center", col.bg)}>
              <col.icon className={cn("h-5 w-5 mx-auto mb-1.5", col.color)} />
              <p className={cn("text-2xl font-bold", col.color)}>{count}</p>
              <p className="text-[11px] text-muted-foreground font-medium">{col.label}</p>
              <div className="mt-2 h-1.5 rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full transition-all", col.bar)}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </DashboardWidget>
  )
}
