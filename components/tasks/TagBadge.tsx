'use client'

import { X } from 'lucide-react'

export interface TagData {
  id: string
  name: string
  color: string
  description?: string | null
}

interface TagBadgeProps {
  tag: TagData
  editable?: boolean
  onRemove?: (tagId: string) => void
}

/**
 * Calcula se o texto deve ser claro ou escuro baseado na cor de fundo.
 */
function getContrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? 'oklch(0.15 0.02 265)' : 'oklch(0.98 0 0)'
}

export function TagBadge({ tag, editable = false, onRemove }: TagBadgeProps) {
  const textColor = getContrastColor(tag.color)

  return (
    <span
      title={tag.description || undefined}
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-opacity hover:opacity-90"
      style={{
        backgroundColor: tag.color,
        color: textColor,
      }}
    >
      {tag.name}
      {editable && onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRemove(tag.id)
          }}
          className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-foreground/20"
          aria-label={`Remover tag ${tag.name}`}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  )
}
