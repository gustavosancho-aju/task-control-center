"use client"

import type { ReactNode } from "react"
import { X, GripVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { WidgetSize } from "@/types/dashboard"

interface DashboardWidgetProps {
  title: string
  icon?: ReactNode
  children: ReactNode
  size: WidgetSize
  onRemove?: () => void
  isEditing?: boolean
  actions?: ReactNode
  className?: string
  noPadding?: boolean
}

const SIZE_CLASSES: Record<WidgetSize, string> = {
  small: "col-span-1",
  medium: "col-span-1 lg:col-span-1",
  large: "col-span-1 lg:col-span-2",
  full: "col-span-1 lg:col-span-2",
}

export function DashboardWidget({
  title,
  icon,
  children,
  size,
  onRemove,
  isEditing = false,
  actions,
  className,
  noPadding = false,
}: DashboardWidgetProps) {
  return (
    <div
      className={cn(
        "bg-card rounded-xl border shadow-sm transition-all relative group",
        isEditing && "ring-2 ring-dashed ring-primary/30 hover:ring-primary/50",
        SIZE_CLASSES[size],
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2 min-w-0">
          {isEditing && (
            <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 cursor-grab" />
          )}
          {icon && <span className="shrink-0">{icon}</span>}
          <h3 className="text-sm font-semibold truncate">{title}</h3>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {actions}
          {isEditing && onRemove && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onRemove}
              className="h-6 w-6 text-muted-foreground hover:text-destructive"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className={cn(noPadding ? "" : "px-4 pb-4")}>
        {children}
      </div>
    </div>
  )
}
