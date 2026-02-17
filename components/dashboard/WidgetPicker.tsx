"use client"

import { useState } from "react"
import {
  BarChart3,
  ListTodo,
  Columns3,
  Zap,
  Bot,
  TrendingUp,
  PieChart,
  Rocket,
  Plus,
  Check,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { WIDGET_REGISTRY, type WidgetType, type WidgetConfig } from "@/types/dashboard"

interface WidgetPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentWidgets: WidgetConfig[]
  onAddWidget: (type: WidgetType) => void
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  BarChart3,
  ListTodo,
  Columns3,
  Zap,
  Bot,
  TrendingUp,
  PieChart,
  Rocket,
}

const WIDGET_TYPES = Object.values(WIDGET_REGISTRY)

export function WidgetPicker({ open, onOpenChange, currentWidgets, onAddWidget }: WidgetPickerProps) {
  const activeTypes = new Set(currentWidgets.map((w) => w.type))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar Widget</DialogTitle>
          <DialogDescription>
            Escolha um widget para adicionar ao dashboard
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto py-2">
          {WIDGET_TYPES.map((meta) => {
            const isActive = activeTypes.has(meta.type)
            const IconComponent = ICON_MAP[meta.icon]

            return (
              <button
                key={meta.type}
                onClick={() => {
                  if (!isActive) {
                    onAddWidget(meta.type)
                  }
                }}
                disabled={isActive}
                className={cn(
                  "flex items-center gap-3 rounded-lg border p-3 text-left transition-colors w-full",
                  isActive
                    ? "opacity-50 cursor-not-allowed bg-muted"
                    : "hover:bg-muted/50 hover:border-primary/30 cursor-pointer"
                )}
              >
                <div className={cn(
                  "flex items-center justify-center h-10 w-10 rounded-lg shrink-0",
                  isActive ? "bg-muted" : "bg-primary/10"
                )}>
                  {IconComponent && (
                    <IconComponent className={cn("h-5 w-5", isActive ? "text-muted-foreground" : "text-primary")} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{meta.label}</p>
                  <p className="text-xs text-muted-foreground">{meta.description}</p>
                </div>

                <div className="shrink-0">
                  {isActive ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Plus className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </button>
            )
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
