'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Check, Plus, Loader2, ChevronDown } from 'lucide-react'
import { TagBadge, type TagData } from './TagBadge'

interface TagSelectorProps {
  taskId: string
  selectedTags: TagData[]
  onChange: (tags: TagData[]) => void
}

export function TagSelector({ taskId, selectedTags, onChange }: TagSelectorProps) {
  const [allTags, setAllTags] = useState<TagData[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const fetchTags = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/tags')
      if (res.ok) {
        const data = await res.json()
        if (data.success) setAllTags(data.data)
      }
    } catch (err) {
      console.error('Error fetching tags:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTags()
  }, [fetchTags])

  // Click outside to close
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const selectedIds = new Set(selectedTags.map((t) => t.id))

  const filtered = allTags.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) &&
      !selectedIds.has(t.id)
  )

  const canCreateNew =
    search.trim().length > 0 &&
    !allTags.some((t) => t.name.toLowerCase() === search.trim().toLowerCase())

  const toggleTag = async (tag: TagData) => {
    try {
      await fetch(`/api/tasks/${taskId}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagId: tag.id }),
      })
      onChange([...selectedTags, tag])
    } catch (err) {
      console.error('Error adding tag:', err)
    }
  }

  const removeTag = async (tagId: string) => {
    try {
      await fetch(`/api/tasks/${taskId}/tags`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagId }),
      })
      onChange(selectedTags.filter((t) => t.id !== tagId))
    } catch (err) {
      console.error('Error removing tag:', err)
    }
  }

  const PRESET_COLORS = [
    '#EF4444', '#F97316', '#EAB308', '#22C55E',
    '#3B82F6', '#8B5CF6', '#EC4899', '#6B7280',
  ]

  const createTag = async () => {
    if (!canCreateNew || creating) return
    setCreating(true)
    try {
      const color = PRESET_COLORS[allTags.length % PRESET_COLORS.length]
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: search.trim(), color }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          const newTag = data.data as TagData
          setAllTags((prev) => [...prev, newTag])
          await toggleTag(newTag)
          setSearch('')
        }
      }
    } catch (err) {
      console.error('Error creating tag:', err)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Selected tags + trigger */}
      <div
        className="flex flex-wrap items-center gap-1.5 min-h-[36px] rounded-md border border-input bg-background px-2 py-1.5 cursor-pointer"
        onClick={() => {
          setOpen(!open)
          if (!open) setTimeout(() => inputRef.current?.focus(), 50)
        }}
      >
        {selectedTags.map((tag) => (
          <TagBadge key={tag.id} tag={tag} editable onRemove={removeTag} />
        ))}
        {selectedTags.length === 0 && !open && (
          <span className="text-sm text-muted-foreground">Selecionar tags...</span>
        )}
        {open && (
          <input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canCreateNew) {
                e.preventDefault()
                createTag()
              }
            }}
            className="flex-1 min-w-[80px] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            placeholder="Buscar ou criar..."
            onClick={(e) => e.stopPropagation()}
          />
        )}
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-auto shrink-0" />
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          <div className="max-h-48 overflow-y-auto p-1">
            {loading && (
              <div className="flex items-center justify-center py-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}

            {!loading && filtered.length === 0 && !canCreateNew && (
              <div className="py-3 text-center text-xs text-muted-foreground">
                {search ? 'Nenhuma tag encontrada' : 'Todas as tags já selecionadas'}
              </div>
            )}

            {filtered.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleTag(tag)}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent transition-colors text-left"
              >
                <span
                  className="h-3 w-3 rounded-full shrink-0"
                  style={{ backgroundColor: tag.color }}
                />
                <span className="flex-1 truncate">{tag.name}</span>
                {selectedIds.has(tag.id) && (
                  <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                )}
              </button>
            ))}

            {canCreateNew && (
              <button
                type="button"
                onClick={createTag}
                disabled={creating}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent transition-colors text-left border-t mt-1 pt-2"
              >
                {creating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground shrink-0" />
                ) : (
                  <Plus className="h-3.5 w-3.5 text-primary shrink-0" />
                )}
                <span>
                  Criar <strong>&quot;{search.trim()}&quot;</strong>
                </span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
