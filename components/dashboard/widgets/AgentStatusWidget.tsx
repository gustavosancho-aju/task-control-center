"use client"

import { useMemo } from "react"
import { Bot } from "lucide-react"
import { cn } from "@/lib/utils"
import { ROLE_COLORS } from "@/lib/colors"
import { DashboardWidget } from "../DashboardWidget"
import type { DashboardData, WidgetSize } from "@/types/dashboard"

interface Props {
  data: DashboardData
  size: WidgetSize
  isEditing?: boolean
  onRemove?: () => void
}

export function AgentStatusWidget({ data, size, isEditing, onRemove }: Props) {
  const agentStats = useMemo(() => {
    return data.agents.map((agent) => {
      const assignedTasks = data.tasks.filter((t) => t.agentId === agent.id)
      const runningExecs = data.activeExecutions.filter(
        (e) => e.agentId === agent.id && e.status === "RUNNING"
      )
      const doneTasks = assignedTasks.filter((t) => t.status === "DONE").length
      const totalTasks = assignedTasks.length

      return {
        ...agent,
        totalTasks,
        doneTasks,
        inProgress: assignedTasks.filter((t) => t.status === "IN_PROGRESS").length,
        isExecuting: runningExecs.length > 0,
        executionCount: runningExecs.length,
      }
    })
  }, [data.agents, data.tasks, data.activeExecutions])

  return (
    <DashboardWidget
      title="Status dos Agentes"
      icon={<Bot className="h-4 w-4 text-muted-foreground" />}
      size={size}
      isEditing={isEditing}
      onRemove={onRemove}
    >
      {agentStats.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Nenhum agente cadastrado</p>
      ) : (
        <div className="space-y-2">
          {agentStats.map((agent) => {
            const role = agent.role as keyof typeof ROLE_COLORS
            const colors = ROLE_COLORS[role] || ROLE_COLORS.MAESTRO
            return (
              <div key={agent.id} className="flex items-center gap-3 rounded-lg border p-2.5">
                {/* Status dot */}
                <div className="relative shrink-0">
                  <div className={cn("h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold", colors.monitor)}>
                    {agent.name.charAt(0)}
                  </div>
                  {agent.isExecuting && (
                    <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-card animate-pulse" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{agent.name}</p>
                    <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full", colors.badge)}>
                      {agent.role}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-muted-foreground">
                      {agent.totalTasks} {agent.totalTasks === 1 ? "tarefa" : "tarefas"}
                    </span>
                    {agent.inProgress > 0 && (
                      <span className="text-xs text-blue-600 dark:text-blue-400">
                        {agent.inProgress} em progresso
                      </span>
                    )}
                    {agent.isExecuting && (
                      <span className="text-xs text-green-600 dark:text-green-400">
                        {agent.executionCount} executando
                      </span>
                    )}
                  </div>
                </div>

                {/* Mini completion bar */}
                {agent.totalTasks > 0 && (
                  <div className="shrink-0 w-12">
                    <div className="h-1.5 rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-green-500 transition-all"
                        style={{ width: `${Math.round((agent.doneTasks / agent.totalTasks) * 100)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground text-center mt-0.5">
                      {Math.round((agent.doneTasks / agent.totalTasks) * 100)}%
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </DashboardWidget>
  )
}
