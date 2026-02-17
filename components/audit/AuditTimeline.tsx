"use client"

import { useState } from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"
import {
  Plus,
  Pencil,
  Trash2,
  Play,
  UserPlus,
  CheckCircle2,
  MessageSquare,
  Upload,
  ChevronDown,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuditEntry {
  id: string
  entityType: string
  entityId: string
  action: string
  changes?: Record<string, { from: unknown; to: unknown }> | null
  performedBy: string
  ipAddress?: string | null
  createdAt: string
}

interface AuditTimelineProps {
  entries: AuditEntry[]
  showEntity?: boolean
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const ACTION_CONFIG: Record<
  string,
  { icon: typeof Plus; label: string; color: string; bgColor: string }
> = {
  CREATE: {
    icon: Plus,
    label: "Criado",
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
  UPDATE: {
    icon: Pencil,
    label: "Atualizado",
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  DELETE: {
    icon: Trash2,
    label: "Removido",
    color: "text-red-600",
    bgColor: "bg-red-100",
  },
  EXECUTE: {
    icon: Play,
    label: "Executado",
    color: "text-purple-600",
    bgColor: "bg-purple-100",
  },
  ASSIGN: {
    icon: UserPlus,
    label: "Atribuido",
    color: "text-indigo-600",
    bgColor: "bg-indigo-100",
  },
  COMPLETE: {
    icon: CheckCircle2,
    label: "Concluido",
    color: "text-emerald-600",
    bgColor: "bg-emerald-100",
  },
  COMMENT: {
    icon: MessageSquare,
    label: "Comentario",
    color: "text-sky-600",
    bgColor: "bg-sky-100",
  },
  UPLOAD: {
    icon: Upload,
    label: "Upload",
    color: "text-amber-600",
    bgColor: "bg-amber-100",
  },
}

const ENTITY_COLORS: Record<string, string> = {
  Task: "bg-blue-50 text-blue-700 border-blue-200",
  Execution: "bg-purple-50 text-purple-700 border-purple-200",
  Comment: "bg-sky-50 text-sky-700 border-sky-200",
  Attachment: "bg-amber-50 text-amber-700 border-amber-200",
  Settings: "bg-muted text-foreground border-border",
}

const DEFAULT_ACTION = {
  icon: Pencil,
  label: "Ação",
  color: "text-muted-foreground",
  bgColor: "bg-muted",
}

// ---------------------------------------------------------------------------
// Change viewer
// ---------------------------------------------------------------------------

function ChangeDetail({ changes }: { changes: Record<string, { from: unknown; to: unknown }> }) {
  return (
    <div className="space-y-1.5 mt-2">
      {Object.entries(changes).map(([field, { from, to }]) => (
        <div key={field} className="flex items-start gap-2 text-xs">
          <span className="font-medium text-muted-foreground min-w-[80px] shrink-0">{field}:</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {from != null && (
              <span className="inline-flex items-center rounded bg-red-50 text-red-700 px-1.5 py-0.5 line-through">
                {String(from)}
              </span>
            )}
            {from != null && to != null && (
              <span className="text-muted-foreground">→</span>
            )}
            {to != null && (
              <span className="inline-flex items-center rounded bg-green-50 text-green-700 px-1.5 py-0.5">
                {String(to)}
              </span>
            )}
            {from == null && to == null && (
              <span className="text-muted-foreground">-</span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Single timeline entry
// ---------------------------------------------------------------------------

function TimelineEntry({
  entry,
  showEntity,
  isLast,
}: {
  entry: AuditEntry
  showEntity: boolean
  isLast: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const config = ACTION_CONFIG[entry.action] || DEFAULT_ACTION
  const Icon = config.icon
  const hasChanges = entry.changes && Object.keys(entry.changes).length > 0

  return (
    <div className="relative flex gap-3">
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-[15px] top-[32px] bottom-0 w-px bg-border" />
      )}

      {/* Icon */}
      <div
        className={cn(
          "flex items-center justify-center h-8 w-8 rounded-full shrink-0 z-10",
          config.bgColor
        )}
      >
        <Icon className={cn("h-4 w-4", config.color)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-6">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("text-sm font-medium", config.color)}>
              {config.label}
            </span>

            {showEntity && (
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] px-1.5 py-0",
                  ENTITY_COLORS[entry.entityType] || ENTITY_COLORS.Settings
                )}
              >
                {entry.entityType}
              </Badge>
            )}

            <span className="text-xs text-muted-foreground">
              por {entry.performedBy}
            </span>
          </div>

          <span className="text-[11px] text-muted-foreground shrink-0">
            {format(new Date(entry.createdAt), "dd/MM/yy HH:mm", { locale: ptBR })}
          </span>
        </div>

        {showEntity && (
          <p className="text-xs text-muted-foreground mt-0.5 font-mono truncate">
            {entry.entityId}
          </p>
        )}

        {/* Expandable changes */}
        {hasChanges && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-1 transition-colors"
          >
            {expanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            {expanded ? "Ocultar detalhes" : "Ver detalhes"}
          </button>
        )}

        {expanded && hasChanges && (
          <div className="bg-muted rounded-lg border p-3 mt-2">
            <ChangeDetail changes={entry.changes as Record<string, { from: unknown; to: unknown }>} />
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function AuditTimeline({ entries, showEntity = true }: AuditTimelineProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground border rounded-lg border-dashed">
        Nenhum registro de auditoria encontrado
      </div>
    )
  }

  return (
    <div className="space-y-0">
      {entries.map((entry, i) => (
        <TimelineEntry
          key={entry.id}
          entry={entry}
          showEntity={showEntity}
          isLast={i === entries.length - 1}
        />
      ))}
    </div>
  )
}
