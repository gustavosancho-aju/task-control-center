'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Paperclip, X } from 'lucide-react'
import { AttachmentItem, type AttachmentData } from './AttachmentItem'
import { AttachmentUpload } from './AttachmentUpload'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { notifySuccess, notifyError } from '@/lib/notifications'

interface AttachmentListProps {
  taskId: string
}

export function AttachmentList({ taskId }: AttachmentListProps) {
  const [attachments, setAttachments] = useState<AttachmentData[]>([])
  const [loading, setLoading] = useState(true)
  const [previewAttachment, setPreviewAttachment] = useState<AttachmentData | null>(null)

  const fetchAttachments = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/attachments`)
      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          setAttachments(data.data)
        }
      }
    } catch (err) {
      console.error('Error fetching attachments:', err)
    } finally {
      setLoading(false)
    }
  }, [taskId])

  useEffect(() => {
    fetchAttachments()
  }, [fetchAttachments])

  const handleUploadComplete = () => {
    fetchAttachments()
  }

  const handleDelete = async (attachmentId: string) => {
    try {
      const res = await fetch(`/api/attachments/${attachmentId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const d = await res.json()
        notifyError('Erro ao excluir', d.error)
        return
      }
      notifySuccess('Anexo removido')
      await fetchAttachments()
    } catch {
      notifyError('Erro', 'Não foi possível remover o anexo.')
    }
  }

  const handlePreview = (attachment: AttachmentData) => {
    setPreviewAttachment(attachment)
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
      {/* Upload Zone */}
      <AttachmentUpload taskId={taskId} onUploadComplete={handleUploadComplete} />

      {/* Attachments List */}
      {attachments.length === 0 ? (
        <div className="py-6 text-center text-sm text-muted-foreground">
          <Paperclip className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
          Nenhum anexo ainda.
          <br />
          Arraste arquivos ou clique para enviar.
        </div>
      ) : (
        <div>
          <p className="text-xs text-muted-foreground mb-2">
            {attachments.length} anexo{attachments.length !== 1 ? 's' : ''}
          </p>
          <div className="space-y-2">
            {attachments.map((attachment) => (
              <AttachmentItem
                key={attachment.id}
                attachment={attachment}
                onDelete={handleDelete}
                onPreview={handlePreview}
              />
            ))}
          </div>
        </div>
      )}

      {/* Preview Modal */}
      <Dialog
        open={previewAttachment !== null}
        onOpenChange={(open) => {
          if (!open) setPreviewAttachment(null)
        }}
      >
        <DialogContent className="max-w-3xl max-h-[85vh] p-0 overflow-hidden">
          {previewAttachment && (
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <p className="text-sm font-medium truncate pr-4">
                  {previewAttachment.originalName}
                </p>
                <button
                  onClick={() => setPreviewAttachment(null)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-muted/30">
                {previewAttachment.mimeType.startsWith('image/') && (
                  <img
                    src={previewAttachment.url}
                    alt={previewAttachment.originalName}
                    className="max-w-full max-h-[70vh] object-contain rounded"
                  />
                )}
                {previewAttachment.mimeType === 'application/pdf' && (
                  <iframe
                    src={previewAttachment.url}
                    className="w-full h-[70vh] rounded border"
                    title={previewAttachment.originalName}
                  />
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
