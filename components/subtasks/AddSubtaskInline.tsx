'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface AddSubtaskInlineProps {
  onAdd: (title: string) => Promise<void>
}

export function AddSubtaskInline({ onAdd }: AddSubtaskInlineProps) {
  const [active, setActive] = useState(false)
  const [title, setTitle] = useState('')
  const [adding, setAdding] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (active) {
      inputRef.current?.focus()
    }
  }, [active])

  const handleSubmit = async () => {
    const trimmed = title.trim()
    if (!trimmed || adding) return

    setAdding(true)
    try {
      await onAdd(trimmed)
      setTitle('')
      // Keep active for rapid creation
      inputRef.current?.focus()
    } finally {
      setAdding(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === 'Escape') {
      setActive(false)
      setTitle('')
    }
  }

  if (!active) {
    return (
      <button
        onClick={() => setActive(true)}
        className="w-full flex items-center gap-2 rounded-lg border border-dashed p-2.5 text-sm text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-accent/5 transition-colors"
      >
        <Plus className="h-4 w-4" />
        Adicionar subtarefa
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (!title.trim()) {
            setActive(false)
          }
        }}
        placeholder="Título da subtarefa (Enter para criar, Esc para cancelar)"
        disabled={adding}
        className="text-sm h-9"
      />
      <Button
        size="sm"
        className="h-9 px-3 flex-shrink-0"
        onClick={handleSubmit}
        disabled={adding || !title.trim()}
      >
        {adding ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Plus className="h-3.5 w-3.5" />
        )}
      </Button>
    </div>
  )
}
