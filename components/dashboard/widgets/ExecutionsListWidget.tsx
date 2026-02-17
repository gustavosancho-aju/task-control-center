"use client"

import Link from "next/link"
import { Zap, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { AgentBadge } from "@/components/agents/AgentBadge"
import { EXECUTION_COLORS } from "@/lib/colors"
import { DashboardWidget } from "../DashboardWidget"
import type { DashboardData, WidgetSize } from "@/types/dashboard"

interface Props {
  data: DashboardData
  size: WidgetSize
  isEditing?: boolean
  onRemove?: () => void
}

export function ExecutionsListWidget({ data, size, isEditing, onRemove }: Props) {
  const limit = size === "small" ? 3 : size === "medium" ? 5 : 8
  const executions = data.activeExecutions.slice(0, limit)

  return (
    <DashboardWidget
      title={`Execuções Ativas (${data.activeExecutions.length})`}
      icon={<Zap className="h-4 w-4 text-amber-500 dark:text-amber-400" />}
      size={size}
      isEditing={isEditing}
      onRemove={onRemove}
      actions={
        <Link href="/monitor" className="text-xs text-primary hover:underline flex items-center gap-1">
          Monitor <ExternalLink className="h-3 w-3" />
        </Link>
      }
    >
      {executions.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          Nenhuma execução ativa
        </p>
      ) : (
        <div className="space-y-2">
          {executions.map((exec) => {
            const isRunning = exec.status === "RUNNING"
            return (
              <Link
                key={exec.id}
                href={`/executions/${exec.id}`}
                className="block rounded-lg border p-2.5 hover:shadow-sm transition-shadow relative overflow-hidden"
              >
                {/* Progress bar top */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-muted">
                  <div
                    className={cn(
                      "h-full transition-all duration-500",
                      isRunning ? EXECUTION_COLORS.RUNNING.progress.bar : "bg-yellow-500 dark:bg-yellow-600"
                    )}
                    style={{ width: `${exec.progress}%` }}
                  />
                  {isRunning && (
                    <div
                      className={`absolute inset-0 h-full animate-pulse ${EXECUTION_COLORS.RUNNING.progress.pulse}`}
                      style={{ width: `${exec.progress}%` }}
                    />
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 pt-0.5">
                  <p className="text-sm font-medium truncate flex-1">
                    {exec.task?.title ?? `Tarefa ${exec.taskId.slice(0, 8)}...`}
                  </p>
                  <span className={cn(
                    "inline-flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5 shrink-0 border",
                    isRunning ? EXECUTION_COLORS.RUNNING.label : EXECUTION_COLORS.PAUSED.label
                  )}>
                    {isRunning && <span className={`h-1.5 w-1.5 rounded-full animate-pulse ${EXECUTION_COLORS.RUNNING.progress.bar}`} />}
                    {isRunning ? "Executando" : "Pausado"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 mt-1.5">
                  {exec.agent && (
                    <AgentBadge name={exec.agent.name} role={exec.agent.role} />
                  )}
                  <span className="text-xs font-mono text-muted-foreground">{exec.progress}%</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </DashboardWidget>
  )
}
