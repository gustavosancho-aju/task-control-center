"use client"

import { useMemo } from "react"
import { DragDropContext, type DropResult } from "@hello-pangea/dnd"
import { Circle, Clock, Eye, CheckCircle, XCircle } from "lucide-react"
import { notifyError } from "@/lib/notifications"
import { KanbanColumn } from "./KanbanColumn"

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

type TaskStatus = Task["status"]

interface KanbanBoardProps {
  tasks: Task[]
  onTaskMove: (taskId: string, newStatus: string) => Promise<void>
  onTaskClick: (taskId: string) => void
}

const columns = [
  { id: "TODO" as const, title: "A Fazer", icon: <Circle className="h-4 w-4" />, color: "bg-slate-500/90 text-white" },
  { id: "IN_PROGRESS" as const, title: "Em Progresso", icon: <Clock className="h-4 w-4" />, color: "bg-blue-500/90 text-white" },
  { id: "REVIEW" as const, title: "Em Revisão", icon: <Eye className="h-4 w-4" />, color: "bg-yellow-500/90 text-white" },
  { id: "DONE" as const, title: "Concluído", icon: <CheckCircle className="h-4 w-4" />, color: "bg-green-500/90 text-white" },
  { id: "BLOCKED" as const, title: "Bloqueado", icon: <XCircle className="h-4 w-4" />, color: "bg-red-500/90 text-white" },
]

// State machine: allowed transitions per status
const allowedTransitions: Record<TaskStatus, TaskStatus[]> = {
  TODO: ["IN_PROGRESS", "BLOCKED"],
  IN_PROGRESS: ["REVIEW", "BLOCKED", "TODO"],
  REVIEW: ["DONE", "IN_PROGRESS", "BLOCKED"],
  DONE: ["REVIEW"],
  BLOCKED: ["TODO", "IN_PROGRESS"],
}

const statusLabels: Record<TaskStatus, string> = {
  TODO: "A Fazer",
  IN_PROGRESS: "Em Progresso",
  REVIEW: "Em Revisão",
  DONE: "Concluído",
  BLOCKED: "Bloqueado",
}

export function KanbanBoard({ tasks, onTaskMove, onTaskClick }: KanbanBoardProps) {
  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      TODO: [],
      IN_PROGRESS: [],
      REVIEW: [],
      DONE: [],
      BLOCKED: [],
    }
    for (const task of tasks) {
      grouped[task.status].push(task)
    }
    return grouped
  }, [tasks])

  function onDragEnd(result: DropResult) {
    const { destination, source, draggableId } = result

    // Dropped outside a valid area
    if (!destination) return

    // Dropped in same position
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    const from = source.droppableId as TaskStatus
    const to = destination.droppableId as TaskStatus

    // Same column reorder — no status change needed
    if (from === to) return

    // Validate transition
    if (!allowedTransitions[from].includes(to)) {
      notifyError("Transição não permitida", `Não é possível mover de "${statusLabels[from]}" para "${statusLabels[to]}"`)

      return
    }

    onTaskMove(draggableId, to)
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-10rem)]">
        {columns.map((col) => (
          <KanbanColumn
            key={col.id}
            id={col.id}
            title={col.title}
            tasks={tasksByStatus[col.id]}
            icon={col.icon}
            color={col.color}
            onTaskClick={onTaskClick}
          />
        ))}
      </div>
    </DragDropContext>
  )
}
