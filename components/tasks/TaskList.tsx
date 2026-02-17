"use client"
import { TaskCard } from "./TaskCard"

interface Task {
  id: string
  title: string
  description?: string | null
  status: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE" | "BLOCKED"
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"
  createdAt: string
  agent?: { id: string; name: string; role: "MAESTRO" | "SENTINEL" | "ARCHITECTON" | "PIXEL" } | null
  agentId?: string | null
}

interface TaskListProps {
  tasks: Task[]
  onStatusChange?: (taskId: string, newStatus: string) => void
  onSelect?: (taskId: string) => void
  onAutoAssign?: (taskId: string) => void
}

export function TaskList({ tasks, onStatusChange, onSelect, onAutoAssign }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg">Nenhuma tarefa encontrada</p>
        <p className="text-sm">Crie uma nova tarefa para comecar</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          onStatusChange={onStatusChange}
          onSelect={onSelect}
          onAutoAssign={onAutoAssign}
        />
      ))}
    </div>
  )
}
