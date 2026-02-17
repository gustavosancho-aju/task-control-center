"use client"

import { Draggable } from "@hello-pangea/dnd"
import { PriorityBadge } from "@/components/tasks/PriorityBadge"
import { AgentBadge } from "@/components/agents/AgentBadge"
import { ListTodo, Loader2, Play, Pause } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"
import type { TaskExecution } from "@/components/tasks/TaskCard"
import { PRIORITY_COLORS, EXECUTION_COLORS, SEMANTIC_COLORS } from "@/lib/colors"

interface Task {
  id: string
  title: string
  description?: string | null
  status: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE" | "BLOCKED"
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"
  createdAt: string
  agent?: { id: string; name: string; role: "MAESTRO" | "SENTINEL" | "ARCHITECTON" | "PIXEL" } | null
  agentId?: string | null
  dueDate?: string | null
  subtasks?: { id: string }[]
  _count?: { statusHistory?: number }
}

interface KanbanCardProps {
  task: Task
  index: number
  execution?: TaskExecution | null
  onClick?: (taskId: string) => void
  onExecute?: (taskId: string, agentId: string) => void
}

const PRIORITY_BORDER: Record<string, string> = {
  URGENT: PRIORITY_COLORS.URGENT.border,
  HIGH: PRIORITY_COLORS.HIGH.border,
  MEDIUM: PRIORITY_COLORS.MEDIUM.border,
  LOW: PRIORITY_COLORS.LOW.border,
}

const EXEC_STATUS_ICON: Record<string, { color: string; animate: boolean; label: string }> = {
  RUNNING: { color: EXECUTION_COLORS.RUNNING.icon, animate: true, label: "Executando" },
  QUEUED: { color: EXECUTION_COLORS.QUEUED.icon, animate: true, label: "Na fila" },
  PAUSED: { color: EXECUTION_COLORS.PAUSED.icon, animate: false, label: "Pausado" },
}

export function KanbanCard({ task, index, execution, onClick, onExecute }: KanbanCardProps) {
  const subtaskCount = task.subtasks?.length ?? 0
  const execStatus = execution ? EXEC_STATUS_ICON[execution.status] : null
  const isRunning = execution?.status === "RUNNING" || execution?.status === "QUEUED"

  const handleExecute = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onExecute && task.agentId) {
      onExecute(task.id, task.agentId)
    }
  }

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onClick?.(task.id)}
          className={cn(
            "bg-card rounded-lg border border-l-[3px] p-3 space-y-2 transition-shadow cursor-grab select-none relative overflow-hidden",
            PRIORITY_BORDER[task.priority] ?? PRIORITY_COLORS.LOW.border,
            snapshot.isDragging
              ? "shadow-lg ring-2 ring-primary/30 rotate-[2deg] cursor-grabbing"
              : "shadow-sm hover:shadow-md"
          )}
          style={provided.draggableProps.style}
        >
          {/* Mini progress bar at top */}
          {isRunning && execution && (
            <div className={`absolute top-0 left-0 right-0 h-0.5 ${EXECUTION_COLORS.RUNNING.progress.track}`}>
              <div
                className={`h-full ${EXECUTION_COLORS.RUNNING.progress.bar} transition-all duration-500`}
                style={{ width: `${execution.progress}%` }}
              />
            </div>
          )}

          {/* Execution status icon - top right corner */}
          {execStatus && (
            <div className="absolute top-1.5 right-1.5" title={execStatus.label}>
              {execution?.status === "PAUSED" ? (
                <Pause className={cn("h-3.5 w-3.5", execStatus.color)} />
              ) : execStatus.animate ? (
                <Loader2 className={cn("h-3.5 w-3.5 animate-spin", execStatus.color)} />
              ) : null}
            </div>
          )}

          {/* Title */}
          <p className="text-sm font-medium line-clamp-2 leading-snug pr-5">{task.title}</p>

          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-1.5">
            <PriorityBadge priority={task.priority} />
            {task.agent && (
              <AgentBadge name={task.agent.name} role={task.agent.role} />
            )}
            {isRunning && execution && (
              <span className={`text-[10px] font-medium rounded px-1.5 py-0.5 ${EXECUTION_COLORS.RUNNING.label}`}>
                {execution.progress}%
              </span>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <span className="text-[11px] text-muted-foreground">
              {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true, locale: ptBR })}
            </span>

            <div className="flex items-center gap-1.5">
              {subtaskCount > 0 && (
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <ListTodo className="h-3 w-3" />
                  {subtaskCount}
                </span>
              )}
              {/* Execute button */}
              {task.agentId && !isRunning && !execStatus && task.status !== "DONE" && onExecute && (
                <button
                  onClick={handleExecute}
                  className={`flex items-center justify-center h-5 w-5 rounded text-muted-foreground transition-colors ${SEMANTIC_COLORS.executeHover}`}
                  title={`Executar com ${task.agent?.name ?? "agente"}`}
                >
                  <Play className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  )
}
