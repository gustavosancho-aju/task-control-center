"use client"

import { useMemo } from "react"
import Link from "next/link"
import { ListTodo, ExternalLink } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { StatusBadge } from "@/components/tasks/StatusBadge"
import { PriorityBadge } from "@/components/tasks/PriorityBadge"
import { DashboardWidget } from "../DashboardWidget"
import type { DashboardData, WidgetSize } from "@/types/dashboard"

interface Props {
  data: DashboardData
  size: WidgetSize
  isEditing?: boolean
  onRemove?: () => void
}

export function TaskListWidget({ data, size, isEditing, onRemove }: Props) {
  const limit = size === "small" ? 5 : size === "medium" ? 8 : 12

  const recentTasks = useMemo(() => {
    return [...data.tasks]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit)
  }, [data.tasks, limit])

  return (
    <DashboardWidget
      title="Tarefas Recentes"
      icon={<ListTodo className="h-4 w-4 text-muted-foreground" />}
      size={size}
      isEditing={isEditing}
      onRemove={onRemove}
      actions={
        <Link href="/tasks" className="text-xs text-primary hover:underline flex items-center gap-1">
          Ver todas <ExternalLink className="h-3 w-3" />
        </Link>
      }
    >
      {recentTasks.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Nenhuma tarefa</p>
      ) : (
        <div className="space-y-1">
          {recentTasks.map((task) => (
            <Link
              key={task.id}
              href={`/tasks/${task.id}`}
              className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-muted/50 transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                  {task.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true, locale: ptBR })}
                  {task.agent && <span> &middot; {task.agent.name}</span>}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <PriorityBadge priority={task.priority} />
                <StatusBadge status={task.status} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </DashboardWidget>
  )
}
