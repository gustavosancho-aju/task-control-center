'use client'

import { useState, useRef, useEffect } from 'react'
import {
  CheckCircle2,
  Circle,
  Loader2,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Clock,
  Bot,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/tasks/StatusBadge'
import { PriorityBadge } from '@/components/tasks/PriorityBadge'
import type { TaskStatus, TaskPriority } from '@prisma/client'

export interface SubtaskData {
  id: string
  title: string
  description?: string | null
  status: string
  priority: string
  createdAt: string
  updatedAt: string
  estimatedHours?: number | null
  dueDate?: string | null
  agentId?: string | null
  agentName?: string | null
  agent?: { id: string; name: string; role: string } | null
}

interface SubtaskItemProps {
  subtask: SubtaskData
  onToggleStatus: (id: string, done: boolean) => Promise<void>
  onUpdateTitle: (id: string, title: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function SubtaskItem({
  subtask,
  onToggleStatus,
  onUpdateTitle,
  onDelete,
}: SubtaskItemProps) {
  const [toggling, setToggling] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(subtask.title)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const isDone = subtask.status === 'DONE'

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  const handleToggle = async () => {
    setToggling(true)
    try {
      await onToggleStatus(subtask.id, !isDone)
    } finally {
      setToggling(false)
    }
  }

  const handleSaveTitle = async () => {
    const trimmed = editTitle.trim()
    if (!trimmed || trimmed === subtask.title) {
      setEditing(false)
      setEditTitle(subtask.title)
      return
    }
    setSaving(true)
    try {
      await onUpdateTitle(subtask.id, trimmed)
      setEditing(false)
    } catch {
      setEditTitle(subtask.title)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSaveTitle()
    }
    if (e.key === 'Escape') {
      setEditing(false)
      setEditTitle(subtask.title)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await onDelete(subtask.id)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="group rounded-lg border bg-card transition-colors hover:bg-accent/5">
      {/* Main row */}
      <div className="flex items-center gap-2 p-3">
        {/* Checkbox */}
        <button
          onClick={handleToggle}
          disabled={toggling}
          className="flex-shrink-0 transition-colors"
        >
          {toggling ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : isDone ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          ) : (
            <Circle className="h-5 w-5 text-muted-foreground/50 hover:text-primary transition-colors" />
          )}
        </button>

        {/* Title (editable) */}
        <div className="flex-1 min-w-0">
          {editing ? (
            <Input
              ref={inputRef}
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleSaveTitle}
              onKeyDown={handleKeyDown}
              disabled={saving}
              className="h-7 text-sm"
            />
          ) : (
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full text-left flex items-center gap-1.5"
            >
              {(subtask.description || subtask.agent) && (
                <span className="flex-shrink-0 text-muted-foreground">
                  {expanded ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
                  )}
                </span>
              )}
              <span
                className={`text-sm font-medium truncate ${
                  isDone ? 'line-through text-muted-foreground' : ''
                }`}
              >
                {subtask.title}
              </span>
            </button>
          )}
        </div>

        {/* Badges */}
        <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
          {subtask.status !== 'TODO' && subtask.status !== 'DONE' && (
            <StatusBadge status={subtask.status as TaskStatus} />
          )}
          <PriorityBadge priority={subtask.priority as TaskPriority} />
          {subtask.agent && (
            <Badge variant="outline" className="text-[10px] h-5 px-1.5 gap-0.5">
              <Bot className="h-2.5 w-2.5" />
              {subtask.agent.name}
            </Badge>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation()
              setEditing(true)
            }}
            title="Editar"
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Link href={`/tasks/${subtask.id}`} onClick={(e) => e.stopPropagation()}>
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" title="Detalhes">
              <ExternalLink className="h-3 w-3" />
            </Button>
          </Link>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
            onClick={(e) => {
              e.stopPropagation()
              handleDelete()
            }}
            disabled={deleting}
            title="Excluir"
          >
            {deleting ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Trash2 className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && !editing && (
        <div className="px-3 pb-3 pt-0 ml-7 space-y-2 border-t mt-0 pt-2">
          {subtask.description && (
            <p className="text-xs text-muted-foreground whitespace-pre-wrap">
              {subtask.description}
            </p>
          )}
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            {/* Mobile badges */}
            <div className="flex items-center gap-1.5 sm:hidden">
              <StatusBadge status={subtask.status as TaskStatus} />
              <PriorityBadge priority={subtask.priority as TaskPriority} />
            </div>
            {subtask.estimatedHours && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {subtask.estimatedHours}h estimado
              </span>
            )}
            {subtask.agent && (
              <span className="flex items-center gap-1 sm:hidden">
                <Bot className="h-3 w-3" />
                {subtask.agent.name}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
