'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, Loader2, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface Agent {
  id: string
  name: string
  role: string
}

interface CommentFormProps {
  onSubmit: (content: string) => Promise<void>
  placeholder?: string
}

/**
 * Renderiza preview de markdown básico.
 */
function markdownPreview(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-muted rounded p-2 text-xs font-mono my-1">$2</pre>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-xs font-mono">$1</code>')
    .replace(/@(\w+)/g, '<span class="text-primary font-medium">@$1</span>')
    .replace(/\n/g, '<br/>')
}

export function CommentForm({ onSubmit, placeholder }: CommentFormProps) {
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [preview, setPreview] = useState(false)
  const [agents, setAgents] = useState<Agent[]>([])
  const [showMentions, setShowMentions] = useState(false)
  const [mentionSearch, setMentionSearch] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    fetch('/api/agents?active=true')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setAgents(d.data)
      })
      .catch(() => {})
  }, [])

  const handleChange = (value: string) => {
    setContent(value)

    // Detect @ mention
    const cursor = textareaRef.current?.selectionStart ?? value.length
    const textBefore = value.slice(0, cursor)
    const mentionMatch = textBefore.match(/@(\w*)$/)

    if (mentionMatch) {
      setMentionSearch(mentionMatch[1].toLowerCase())
      setShowMentions(true)
    } else {
      setShowMentions(false)
    }
  }

  const insertMention = (agentName: string) => {
    const cursor = textareaRef.current?.selectionStart ?? content.length
    const textBefore = content.slice(0, cursor)
    const textAfter = content.slice(cursor)
    const beforeMention = textBefore.replace(/@\w*$/, '')
    const newContent = `${beforeMention}@${agentName} ${textAfter}`
    setContent(newContent)
    setShowMentions(false)

    // Re-focus
    setTimeout(() => {
      const newCursor = beforeMention.length + agentName.length + 2
      textareaRef.current?.focus()
      textareaRef.current?.setSelectionRange(newCursor, newCursor)
    }, 0)
  }

  const filteredAgents = agents.filter((a) =>
    a.name.toLowerCase().includes(mentionSearch)
  )

  const handleSubmit = async () => {
    if (!content.trim() || submitting) return
    setSubmitting(true)
    try {
      await onSubmit(content.trim())
      setContent('')
      setPreview(false)
    } finally {
      setSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === 'Escape') {
      setShowMentions(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        {preview ? (
          <div
            className="min-h-[80px] rounded-md border bg-background px-3 py-2 text-sm leading-relaxed"
            dangerouslySetInnerHTML={{
              __html: markdownPreview(content) || '<span class="text-muted-foreground">Nada para visualizar</span>',
            }}
          />
        ) : (
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder ?? 'Escreva um comentário... (Ctrl+Enter para enviar)'}
            rows={3}
            className="resize-none text-sm"
          />
        )}

        {/* Mention dropdown */}
        {showMentions && filteredAgents.length > 0 && !preview && (
          <div className="absolute bottom-full mb-1 left-0 w-56 rounded-md border bg-popover shadow-md z-50">
            <div className="p-1">
              {filteredAgents.map((agent) => (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => insertMention(agent.name)}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent transition-colors text-left"
                >
                  <span className="font-medium">{agent.name}</span>
                  <span className="text-xs text-muted-foreground">{agent.role}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs text-muted-foreground"
            onClick={() => setPreview(!preview)}
          >
            {preview ? (
              <><EyeOff className="h-3 w-3 mr-1" /> Editar</>
            ) : (
              <><Eye className="h-3 w-3 mr-1" /> Preview</>
            )}
          </Button>
          <span className="text-[10px] text-muted-foreground self-center ml-1">
            **bold** *italic* `code` @menção
          </span>
        </div>
        <Button
          size="sm"
          className="h-7 px-3 text-xs"
          onClick={handleSubmit}
          disabled={submitting || !content.trim()}
        >
          {submitting ? (
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
          ) : (
            <Send className="h-3 w-3 mr-1" />
          )}
          Comentar
        </Button>
      </div>
    </div>
  )
}
