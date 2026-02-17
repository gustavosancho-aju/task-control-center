"use client"

import { type ReactNode } from "react"
import { Droppable } from "@hello-pangea/dnd"
import { cn } from "@/lib/utils"
import { KanbanCard } from "./KanbanCard"

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
}

interface KanbanColumnProps {
  id: string
  title: string
  tasks: Task[]
  icon: ReactNode
  color: string
  onTaskClick?: (taskId: string) => void
}

export function KanbanColumn({ id, title, tasks, icon, color, onTaskClick }: KanbanColumnProps) {
  return (
    <div className="flex flex-col bg-muted/50 rounded-xl min-w-[280px] w-[320px] max-h-[calc(100vh-12rem)]">
      {/* Header */}
      <div className={cn("flex items-center gap-2 px-4 py-3 rounded-t-xl border-b", color)}>
        <span className="shrink-0">{icon}</span>
        <h3 className="font-semibold text-sm truncate">{title}</h3>
        <span className="ml-auto shrink-0 flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-white/20 text-xs font-medium">
          {tasks.length}
        </span>
      </div>

      {/* Droppable area */}
      <Droppable droppableId={id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "flex-1 overflow-y-auto p-2 space-y-2 transition-colors duration-200 min-h-[120px]",
              snapshot.isDraggingOver && "bg-primary/5 ring-2 ring-inset ring-primary/20 rounded-b-xl"
            )}
          >
            {tasks.map((task, index) => (
              <KanbanCard key={task.id} task={task} index={index} onClick={onTaskClick} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  )
}
