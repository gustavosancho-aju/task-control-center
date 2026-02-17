"use client"

import { WidgetRenderer } from "./widgets"
import type { WidgetConfig, DashboardData } from "@/types/dashboard"

interface DashboardGridProps {
  widgets: WidgetConfig[]
  data: DashboardData
  isEditing: boolean
  onRemoveWidget: (widgetId: string) => void
}

export function DashboardGrid({ widgets, data, isEditing, onRemoveWidget }: DashboardGridProps) {
  if (widgets.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-lg">Dashboard vazio</p>
        <p className="text-sm mt-1">Clique em &quot;Personalizar&quot; para adicionar widgets</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {widgets.map((widget) => (
        <WidgetRenderer
          key={widget.id}
          type={widget.type}
          size={widget.size}
          data={data}
          isEditing={isEditing}
          onRemove={() => onRemoveWidget(widget.id)}
        />
      ))}
    </div>
  )
}
