'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  User,
  Bot,
  Settings,
  Reply,
  Pencil,
  Trash2,
  Loader2,
  Check,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

// ============================================================================
// TYPES
// ============================================================================

export interface CommentData {
  id: string
  taskId: string
  content: string
  authorName: string
  authorType: 'USER' | 'AGENT' | 'SYSTEM'
  parentId: string | null
  createdAt: string
  updatedAt: string
  replies?: CommentData[]
}

interface CommentItemProps {
  comment: CommentData
  depth?: number
  onReply: (parentId: string, content: string) => Promise<void>
  onEdit: (commentId: string, content: string) => Promise<void>
  onDelete: (commentId: string) => Promise<void>
}

// ============================================================================
// HELPERS
// ============================================================================

const AUTHOR_CONFIG = {
  USER: {
    icon: User,
    label: 'Usuário',
    color: 'bg-blue-100 text-blue-700',
    iconColor: 'text-blue-600',
  },
  AGENT: {
    icon: Bot,
    label: 'Agente',
    color: 'bg-purple-100 text-purple-700',
    iconColor: 'text-purple-600',
  },
  SYSTEM: {
    icon: Settings,
    label: 'Sistema',
    color: 'bg-muted text-muted-foreground',
    iconColor: 'text-muted-foreground',
  },
}

/**
 * Renderiza markdown básico: **bold**, *italic*, `code`, ```blocks```
 */
function renderContent(text: string) {
  // Code blocks
  const parts = text.split(/(```[\s\S]*?```)/g)
  return parts.map((part, i) => {
    if (part.startsWith('```') && part.endsWith('```')) {
      const code = part.slice(3, -3).replace(/^\w*\n/, '')
      return (
        <pre key={i} className="bg-muted rounded p-2 text-xs font-mono overflow-x-auto my-1.5">
          {code}
        </pre>
      )
    }
    // Inline markdown
    const html = part
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-xs font-mono">$1</code>')
      .replace(/@(\w+)/g, '<span class="text-primary font-medium">@$1</span>')
    return (
      <span
        key={i}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    )
  })
}

// ============================================================================
// COMPONENT
// ============================================================================

export function CommentItem({
  comment,
  depth = 0,
  onReply,
  onEdit,
  onDelete,
}: CommentItemProps) {
  const [replying, setReplying] = useState(false)
  const [replyContent, setReplyContent] = useState('')
  const [submittingReply, setSubmittingReply] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState(comment.content)
  const [submittingEdit, setSubmittingEdit] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const config = AUTHOR_CONFIG[comment.authorType]
  const Icon = config.icon
  const maxDepth = 2

  const handleReply = async () => {
    if (!replyContent.trim()) return
    setSubmittingReply(true)
    try {
      await onReply(comment.id, replyContent.trim())
      setReplyContent('')
      setReplying(false)
    } finally {
      setSubmittingReply(false)
    }
  }

  const handleEdit = async () => {
    if (!editContent.trim()) return
    setSubmittingEdit(true)
    try {
      await onEdit(comment.id, editContent.trim())
      setEditing(false)
    } finally {
      setSubmittingEdit(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await onDelete(comment.id)
    } finally {
      setDeleting(false)
    }
  }

  const wasEdited = comment.updatedAt !== comment.createdAt

  return (
    <div className={depth > 0 ? 'ml-6 border-l-2 border-muted pl-4' : ''}>
      <div className="group py-3">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1.5">
          <div className={`flex items-center justify-center h-6 w-6 rounded-full shrink-0 ${config.color}`}>
            <Icon className="h-3.5 w-3.5" />
          </div>
          <span className="text-sm font-medium">{comment.authorName}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${config.color}`}>
            {config.label}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(comment.createdAt), {
              addSuffix: true,
              locale: ptBR,
            })}
          </span>
          {wasEdited && (
            <span className="text-[10px] text-muted-foreground italic">(editado)</span>
          )}
        </div>

        {/* Content */}
        {editing ? (
          <div className="space-y-2 ml-8">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={3}
              className="resize-none text-sm"
            />
            <div className="flex gap-1.5">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={handleEdit}
                disabled={submittingEdit || !editContent.trim()}
              >
                {submittingEdit ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <Check className="h-3 w-3 mr-1" />
                )}
                Salvar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={() => {
                  setEditing(false)
                  setEditContent(comment.content)
                }}
              >
                <X className="h-3 w-3 mr-1" />
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <div className="ml-8 text-sm whitespace-pre-wrap leading-relaxed">
            {renderContent(comment.content)}
          </div>
        )}

        {/* Actions */}
        {!editing && (
          <div className="ml-8 mt-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {depth < maxDepth && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-xs text-muted-foreground"
                onClick={() => setReplying(!replying)}
              >
                <Reply className="h-3 w-3 mr-1" />
                Responder
              </Button>
            )}
            {comment.authorType === 'USER' && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs text-muted-foreground"
                  onClick={() => setEditing(true)}
                >
                  <Pencil className="h-3 w-3 mr-1" />
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs text-red-500 hover:text-red-600"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <Trash2 className="h-3 w-3 mr-1" />
                  )}
                  Excluir
                </Button>
              </>
            )}
          </div>
        )}

        {/* Reply form */}
        {replying && (
          <div className="ml-8 mt-2 space-y-2">
            <Textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Escreva uma resposta..."
              rows={2}
              className="resize-none text-sm"
              autoFocus
            />
            <div className="flex gap-1.5">
              <Button
                size="sm"
                className="h-7 px-3 text-xs"
                onClick={handleReply}
                disabled={submittingReply || !replyContent.trim()}
              >
                {submittingReply ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <Reply className="h-3 w-3 mr-1" />
                )}
                Responder
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={() => {
                  setReplying(false)
                  setReplyContent('')
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Nested replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div>
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              depth={depth + 1}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}
