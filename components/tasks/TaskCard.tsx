"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "./StatusBadge"
import { PriorityBadge } from "./PriorityBadge"
import { AgentBadge } from "@/components/agents/AgentBadge"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Bot, Loader2, Play } from "lucide-react"
import { EXECUTION_COLORS } from "@/lib/colors"

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

export interface TaskExecution {
  id: string
  status: "QUEUED" | "RUNNING" | "PAUSED" | "COMPLETED" | "FAILED" | "CANCELLED"
  progress: number
}

interface TaskCardProps {
  task: Task
  execution?: TaskExecution | null
  onStatusChange?: (taskId: string, newStatus: string) => void
  onSelect?: (taskId: string) => void
  onAutoAssign?: (taskId: string) => void
  onExecute?: (taskId: string, agentId: string) => void
}

const nextStatus: Record<string, string> = {
  TODO: "IN_PROGRESS",
  IN_PROGRESS: "REVIEW",
  REVIEW: "DONE",
}

export function TaskCard({ task, execution, onStatusChange, onSelect, onAutoAssign, onExecute }: TaskCardProps) {
  const router = useRouter()
  const [autoAssigning, setAutoAssigning] = useState(false)
  const [executing, setExecuting] = useState(false)
  const canAdvance = task.status !== "DONE" && task.status !== "BLOCKED"
  const hasNoAgent = !task.agentId
  const isRunning = execution?.status === "RUNNING" || execution?.status === "QUEUED"
  const isPaused = execution?.status === "PAUSED"

  const handleCardClick = () => {
    router.push(`/tasks/${task.id}`)
  }

  const handleAutoAssign = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!onAutoAssign) return

    setAutoAssigning(true)
    try {
      await onAutoAssign(task.id)
    } finally {
      setAutoAssigning(false)
    }
  }

  const handleExecute = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!onExecute || !task.agentId) return

    setExecuting(true)
    try {
      await onExecute(task.id, task.agentId)
    } finally {
      setExecuting(false)
    }
  }

  return (
    <Card
      className="hover:shadow-lg hover:border-primary/50 hover:-translate-y-1 transition-all duration-200 cursor-pointer relative overflow-hidden"
      onClick={handleCardClick}
    >
      {/* Mini progress bar at top when running */}
      {isRunning && execution && (
        <div className={`absolute top-0 left-0 right-0 h-1 ${EXECUTION_COLORS.RUNNING.progress.track}`}>
          <div
            className={`h-full ${EXECUTION_COLORS.RUNNING.progress.bar} transition-all duration-500 ease-out`}
            style={{ width: `${execution.progress}%` }}
          />
          <div
            className={`absolute inset-0 h-full ${EXECUTION_COLORS.RUNNING.progress.pulse} animate-pulse`}
            style={{ width: `${execution.progress}%` }}
          />
        </div>
      )}

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
          {/* Execution status indicator */}
          {isRunning && (
            <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${EXECUTION_COLORS.RUNNING.label} rounded-full px-2 py-0.5 border`}>
              <span className={`h-1.5 w-1.5 rounded-full ${EXECUTION_COLORS.RUNNING.progress.bar} animate-pulse`} />
              Executando {execution.progress}%
            </span>
          )}
          {isPaused && (
            <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${EXECUTION_COLORS.PAUSED.label} rounded-full px-2 py-0.5 border`}>
              Pausado
            </span>
          )}
        </div>
        <div className="flex justify-between items-center pt-2 gap-2">
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true, locale: ptBR })}
          </span>
          <div className="flex gap-2">
            {hasNoAgent && onAutoAssign && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleAutoAssign}
                disabled={autoAssigning}
                className="gap-1.5"
              >
                {autoAssigning ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Bot className="h-3.5 w-3.5" />
                )}
                {autoAssigning ? "Atribuindo..." : "Auto-atribuir"}
              </Button>
            )}
            {/* Execute button - only if has agent and not already running */}
            {!hasNoAgent && !isRunning && !isPaused && onExecute && task.status !== "DONE" && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleExecute}
                disabled={executing}
                className="gap-1.5"
              >
                {executing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
              </Button>
            )}
            {canAdvance && (
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation()
                  onStatusChange?.(task.id, nextStatus[task.status])
                }}
              >
                Avançar
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
