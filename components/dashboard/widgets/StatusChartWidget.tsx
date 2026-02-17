"use client"

import { PieChart } from "lucide-react"
import { StatusChart } from "@/components/analytics/StatusChart"
import { DashboardWidget } from "../DashboardWidget"
import type { DashboardData, WidgetSize } from "@/types/dashboard"

interface Props {
  data: DashboardData
  size: WidgetSize
  isEditing?: boolean
  onRemove?: () => void
}

export function StatusChartWidget({ data, size, isEditing, onRemove }: Props) {
  return (
    <DashboardWidget
      title="Status das Tarefas"
      icon={<PieChart className="h-4 w-4 text-muted-foreground" />}
      size={size}
      isEditing={isEditing}
      onRemove={onRemove}
      noPadding
    >
      <div className="px-1 pb-1">
        <StatusChart tasks={data.tasks} />
      </div>
    </DashboardWidget>
  )
}
