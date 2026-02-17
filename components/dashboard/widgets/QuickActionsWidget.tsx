"use client"

import Link from "next/link"
import {
  Rocket,
  Plus,
  Columns3,
  BarChart3,
  Settings,
  Monitor,
  FileText,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { DashboardWidget } from "../DashboardWidget"
import type { WidgetSize } from "@/types/dashboard"

interface Props {
  size: WidgetSize
  isEditing?: boolean
  onRemove?: () => void
}

const ACTIONS = [
  { href: "/create", label: "Nova Tarefa", icon: Plus, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20" },
  { href: "/kanban", label: "Kanban", icon: Columns3, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-900/20" },
  { href: "/analytics", label: "Analytics", icon: BarChart3, color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-900/20" },
  { href: "/monitor", label: "Monitor", icon: Monitor, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20" },
  { href: "/templates", label: "Templates", icon: FileText, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-900/20" },
  { href: "/settings", label: "Configurações", icon: Settings, color: "text-slate-600 dark:text-slate-400", bg: "bg-slate-100 dark:bg-slate-800" },
]

export function QuickActionsWidget({ size, isEditing, onRemove }: Props) {
  return (
    <DashboardWidget
      title="Ações Rápidas"
      icon={<Rocket className="h-4 w-4 text-muted-foreground" />}
      size={size}
      isEditing={isEditing}
      onRemove={onRemove}
    >
      <div className={cn(
        "grid gap-2",
        size === "small" ? "grid-cols-2" : "grid-cols-3"
      )}>
        {ACTIONS.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="flex flex-col items-center gap-1.5 rounded-lg border p-3 hover:bg-muted/50 transition-colors group"
          >
            <div className={cn("flex items-center justify-center h-9 w-9 rounded-lg", action.bg)}>
              <action.icon className={cn("h-5 w-5", action.color)} />
            </div>
            <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
              {action.label}
            </span>
          </Link>
        ))}
      </div>
    </DashboardWidget>
  )
}
