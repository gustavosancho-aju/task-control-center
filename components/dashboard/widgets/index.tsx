"use client"

import dynamic from "next/dynamic"
import type { WidgetType, DashboardData, WidgetSize } from "@/types/dashboard"
import { Skeleton } from "@/components/ui/skeleton"
import { StatsCardsWidget } from "./StatsCardsWidget"
import { TaskListWidget } from "./TaskListWidget"
import { KanbanMiniWidget } from "./KanbanMiniWidget"
import { ExecutionsListWidget } from "./ExecutionsListWidget"
import { AgentStatusWidget } from "./AgentStatusWidget"
import { QuickActionsWidget } from "./QuickActionsWidget"

const ProductivityChartWidget = dynamic(
  () => import("./ProductivityChartWidget").then((m) => ({ default: m.ProductivityChartWidget })),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full rounded-xl" /> }
)

const StatusChartWidget = dynamic(
  () => import("./StatusChartWidget").then((m) => ({ default: m.StatusChartWidget })),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full rounded-xl" /> }
)

interface WidgetRendererProps {
  type: WidgetType
  size: WidgetSize
  data: DashboardData
  isEditing?: boolean
  onRemove?: () => void
}

export function WidgetRenderer({ type, size, data, isEditing, onRemove }: WidgetRendererProps) {
  switch (type) {
    case "stats-cards":
      return <StatsCardsWidget data={data} size={size} isEditing={isEditing} onRemove={onRemove} />
    case "task-list":
      return <TaskListWidget data={data} size={size} isEditing={isEditing} onRemove={onRemove} />
    case "kanban-mini":
      return <KanbanMiniWidget data={data} size={size} isEditing={isEditing} onRemove={onRemove} />
    case "executions-list":
      return <ExecutionsListWidget data={data} size={size} isEditing={isEditing} onRemove={onRemove} />
    case "agent-status":
      return <AgentStatusWidget data={data} size={size} isEditing={isEditing} onRemove={onRemove} />
    case "productivity-chart":
      return <ProductivityChartWidget data={data} size={size} isEditing={isEditing} onRemove={onRemove} />
    case "status-chart":
      return <StatusChartWidget data={data} size={size} isEditing={isEditing} onRemove={onRemove} />
    case "quick-actions":
      return <QuickActionsWidget size={size} isEditing={isEditing} onRemove={onRemove} />
    default:
      return null
  }
}
