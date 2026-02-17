'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, ListTodo } from 'lucide-react'
import { SubtaskItem, type SubtaskData } from './SubtaskItem'
import { AddSubtaskInline } from './AddSubtaskInline'
import { notifySuccess, notifyError } from '@/lib/notifications'

interface SubtaskListProps {
  taskId: string
  onSubtasksChange?: (subtasks: SubtaskData[]) => void
}

export function SubtaskList({ taskId, onSubtasksChange }: SubtaskListProps) {
  const [subtasks, setSubtasks] = useState<SubtaskData[]>([])
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState(0)

  const fetchSubtasks = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/subtasks`)
      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          setSubtasks(data.data)
          setProgress(data.progress)
          onSubtasksChange?.(data.data)
        }
      }
    } catch (err) {
      console.error('Error fetching subtasks:', err)
    } finally {
      setLoading(false)
    }
  }, [taskId, onSubtasksChange])

  useEffect(() => {
    fetchSubtasks()
  }, [fetchSubtasks])

  const handleToggleStatus = async (subtaskId: string, done: boolean) => {
    try {
      const newStatus = done ? 'DONE' : 'TODO'
      const res = await fetch(`/api/tasks/${subtaskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) {
        const d = await res.json()
        notifyError('Erro ao atualizar', d.error)
        return
      }
      await fetchSubtasks()
    } catch {
      notifyError('Erro', 'Não foi possível atualizar o status.')
    }
  }

  const handleUpdateTitle = async (subtaskId: string, title: string) => {
    try {
      const res = await fetch(`/api/tasks/${subtaskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      })
      if (!res.ok) {
        const d = await res.json()
        notifyError('Erro ao editar', d.error)
        throw new Error(d.error)
      }
      await fetchSubtasks()
    } catch (err) {
      if (err instanceof Error && !err.message.includes('Erro ao')) {
        notifyError('Erro', 'Não foi possível editar o título.')
      }
      throw err
    }
  }

  const handleDelete = async (subtaskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${subtaskId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const d = await res.json()
        notifyError('Erro ao excluir', d.error)
        return
      }
      notifySuccess('Subtarefa removida')
      await fetchSubtasks()
    } catch {
      notifyError('Erro', 'Não foi possível remover a subtarefa.')
    }
  }

  const handleAddSubtask = async (title: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/subtasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      })
      if (!res.ok) {
        const d = await res.json()
        notifyError('Erro ao criar', d.error)
        return
      }
      notifySuccess('Subtarefa criada')
      await fetchSubtasks()
    } catch {
      notifyError('Erro', 'Não foi possível criar a subtarefa.')
    }
  }

  if (loading) {
    return (
      <div className="py-6 text-center">
        <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
      </div>
    )
  }

  const total = subtasks.length
  const done = subtasks.filter((s) => s.status === 'DONE').length

  return (
    <div className="space-y-3">
      {/* Progress bar */}
      {total > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {done} de {total} concluída{total !== 1 ? 's' : ''}
            </span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                progress === 100
                  ? 'bg-green-500'
                  : progress > 0
                    ? 'bg-primary'
                    : ''
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Subtask items */}
      {total > 0 && (
        <div className="space-y-1.5">
          {subtasks.map((subtask) => (
            <SubtaskItem
              key={subtask.id}
              subtask={subtask}
              onToggleStatus={handleToggleStatus}
              onUpdateTitle={handleUpdateTitle}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {total === 0 && (
        <div className="py-4 text-center text-sm text-muted-foreground">
          <ListTodo className="h-6 w-6 mx-auto mb-1.5 text-muted-foreground/40" />
          Nenhuma subtarefa criada.
        </div>
      )}

      {/* Inline add */}
      <AddSubtaskInline onAdd={handleAddSubtask} />
    </div>
  )
}
