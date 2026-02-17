"use client"

import { TrendingUp } from "lucide-react"
import { ProductivityChart } from "@/components/analytics/ProductivityChart"
import { DashboardWidget } from "../DashboardWidget"
import type { DashboardData, WidgetSize } from "@/types/dashboard"

interface Props {
  data: DashboardData
  size: WidgetSize
  isEditing?: boolean
  onRemove?: () => void
}

export function ProductivityChartWidget({ data, size, isEditing, onRemove }: Props) {
  return (
    <DashboardWidget
      title="Produtividade"
      icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
      size={size}
      isEditing={isEditing}
      onRemove={onRemove}
      noPadding
    >
      <div className="px-1 pb-1">
        <ProductivityChart tasks={data.tasks} />
      </div>
    </DashboardWidget>
  )
}
