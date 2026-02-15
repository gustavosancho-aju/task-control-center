"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "./StatusBadge"
import { PriorityBadge } from "./PriorityBadge"
import { AgentBadge } from "@/components/agents/AgentBadge"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"

interface Task {
  id: string
  title: string
  description?: string | null
  status: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE" | "BLOCKED"
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"
  createdAt: string
  agent?: { id: string; name: string; role: "MAESTRO" | "SENTINEL" | "ARCHITECTON" | "PIXEL" } | null
}

interface TaskCardProps {
  task: Task
  onStatusChange?: (taskId: string, newStatus: string) => void
  onSelect?: (taskId: string) => void
}

const nextStatus: Record<string, string> = {
  TODO: "IN_PROGRESS",
  IN_PROGRESS: "REVIEW",
  REVIEW: "DONE",
}

export function TaskCard({ task, onStatusChange, onSelect }: TaskCardProps) {
  const canAdvance = task.status !== "DONE" && task.status !== "BLOCKED"

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onSelect?.(task.id)}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-lg font-semibold line-clamp-2">{task.title}</CardTitle>
          <PriorityBadge priority={task.priority} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {task.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
        )}
        <div className="flex flex-wrap gap-2 items-center">
          <StatusBadge status={task.status} />
          {task.agent && <AgentBadge name={task.agent.name} role={task.agent.role} />}
        </div>
        <div className="flex justify-between items-center pt-2">
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true, locale: ptBR })}
          </span>
          {canAdvance && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation()
                onStatusChange?.(task.id, nextStatus[task.status])
              }}
            >
              Avancar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
