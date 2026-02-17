'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, MessageCircle } from 'lucide-react'
import { CommentItem, type CommentData } from './CommentItem'
import { CommentForm } from './CommentForm'
import { notifySuccess, notifyError } from '@/lib/notifications'

interface CommentListProps {
  taskId: string
}

export function CommentList({ taskId }: CommentListProps) {
  const [comments, setComments] = useState<CommentData[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`)
      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          setComments(data.data)
          setTotal(data.total)
        }
      }
    } catch (err) {
      console.error('Error fetching comments:', err)
    } finally {
      setLoading(false)
    }
  }, [taskId])

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  const handleCreate = async (content: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) {
        const d = await res.json()
        notifyError('Erro ao comentar', d.error)
        return
      }
      notifySuccess('Comentário adicionado')
      await fetchComments()
    } catch {
      notifyError('Erro', 'Não foi possível adicionar o comentário.')
    }
  }

  const handleReply = async (parentId: string, content: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, parentId }),
      })
      if (!res.ok) {
        const d = await res.json()
        notifyError('Erro ao responder', d.error)
        return
      }
      notifySuccess('Resposta adicionada')
      await fetchComments()
    } catch {
      notifyError('Erro', 'Não foi possível adicionar a resposta.')
    }
  }

  const handleEdit = async (commentId: string, content: string) => {
    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) {
        const d = await res.json()
        notifyError('Erro ao editar', d.error)
        return
      }
      notifySuccess('Comentário editado')
      await fetchComments()
    } catch {
      notifyError('Erro', 'Não foi possível editar o comentário.')
    }
  }

  const handleDelete = async (commentId: string) => {
    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const d = await res.json()
        notifyError('Erro ao excluir', d.error)
        return
      }
      notifySuccess('Comentário removido')
      await fetchComments()
    } catch {
      notifyError('Erro', 'Não foi possível remover o comentário.')
    }
  }

  if (loading) {
    return (
      <div className="py-6 text-center">
        <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Form */}
      <CommentForm onSubmit={handleCreate} />

      {/* List */}
      {comments.length === 0 ? (
        <div className="py-6 text-center text-sm text-muted-foreground">
          <MessageCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
          Nenhum comentário ainda.
          <br />
          Seja o primeiro a comentar!
        </div>
      ) : (
        <div>
          <p className="text-xs text-muted-foreground mb-2">
            {total} comentário{total !== 1 ? 's' : ''}
          </p>
          <div className="divide-y">
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                onReply={handleReply}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
