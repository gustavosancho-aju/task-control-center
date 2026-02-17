'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  FileText,
  FileImage,
  FileSpreadsheet,
  FileArchive,
  FileCode,
  File,
  Download,
  Eye,
  Trash2,
  Loader2,
  Presentation,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

// ============================================================================
// TYPES
// ============================================================================

export interface AttachmentData {
  id: string
  taskId: string
  filename: string
  originalName: string
  mimeType: string
  size: number
  url: string
  uploadedBy: string
  createdAt: string
}

interface AttachmentItemProps {
  attachment: AttachmentData
  onDelete: (id: string) => Promise<void>
  onPreview: (attachment: AttachmentData) => void
}

// ============================================================================
// HELPERS
// ============================================================================

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const value = bytes / Math.pow(1024, i)
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return { icon: FileImage, color: 'text-emerald-600' }
  if (mimeType === 'application/pdf') return { icon: FileText, color: 'text-red-600' }
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType === 'text/csv')
    return { icon: FileSpreadsheet, color: 'text-green-600' }
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint'))
    return { icon: Presentation, color: 'text-orange-600' }
  if (mimeType.includes('word') || mimeType === 'application/msword')
    return { icon: FileText, color: 'text-blue-600' }
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('gzip'))
    return { icon: FileArchive, color: 'text-yellow-600' }
  if (mimeType === 'application/json' || mimeType === 'text/markdown')
    return { icon: FileCode, color: 'text-purple-600' }
  if (mimeType === 'text/plain') return { icon: FileText, color: 'text-muted-foreground' }
  return { icon: File, color: 'text-muted-foreground' }
}

function truncateFilename(name: string, maxLength: number = 35): string {
  if (name.length <= maxLength) return name
  const ext = name.lastIndexOf('.')
  if (ext === -1) return name.slice(0, maxLength - 3) + '...'
  const extension = name.slice(ext)
  const base = name.slice(0, ext)
  const available = maxLength - extension.length - 3
  if (available <= 0) return name.slice(0, maxLength - 3) + '...'
  return base.slice(0, available) + '...' + extension
}

function isPreviewable(mimeType: string): boolean {
  return mimeType.startsWith('image/') || mimeType === 'application/pdf'
}

// ============================================================================
// COMPONENT
// ============================================================================

export function AttachmentItem({ attachment, onDelete, onPreview }: AttachmentItemProps) {
  const [deleting, setDeleting] = useState(false)
  const { icon: Icon, color } = getFileIcon(attachment.mimeType)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await onDelete(attachment.id)
    } finally {
      setDeleting(false)
    }
  }

  const handleDownload = () => {
    const a = document.createElement('a')
    a.href = `/api/attachments/${attachment.id}`
    a.download = attachment.originalName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div className="group flex items-center gap-3 rounded-lg border p-3 hover:bg-accent/5 transition-colors">
      {/* File Icon */}
      <div className={`flex-shrink-0 ${color}`}>
        <Icon className="h-8 w-8" />
      </div>

      {/* File Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" title={attachment.originalName}>
          {truncateFilename(attachment.originalName)}
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatFileSize(attachment.size)}</span>
          <span>&middot;</span>
          <span>{attachment.uploadedBy}</span>
          <span>&middot;</span>
          <span>
            {formatDistanceToNow(new Date(attachment.createdAt), {
              addSuffix: true,
              locale: ptBR,
            })}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {isPreviewable(attachment.mimeType) && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={() => onPreview(attachment)}
            title="Preview"
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0"
          onClick={handleDownload}
          title="Download"
        >
          <Download className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={handleDelete}
          disabled={deleting}
          title="Excluir"
        >
          {deleting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
    </div>
  )
}
