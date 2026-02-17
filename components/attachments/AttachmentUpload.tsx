'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, X, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { notifySuccess, notifyError } from '@/lib/notifications'

interface AttachmentUploadProps {
  taskId: string
  onUploadComplete: () => void
}

interface UploadFile {
  id: string
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

const ALLOWED_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.txt', '.csv', '.json', '.md',
  '.zip', '.rar', '.gz',
])

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const value = bytes / Math.pow(1024, i)
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

function validateFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) {
    return `Arquivo excede 10MB (${formatFileSize(file.size)})`
  }

  const ext = '.' + file.name.split('.').pop()?.toLowerCase()
  if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
    return `Tipo de arquivo não permitido (${ext || 'desconhecido'})`
  }

  return null
}

export function AttachmentUpload({ taskId, onUploadComplete }: AttachmentUploadProps) {
  const [files, setFiles] = useState<UploadFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dragCountRef = useRef(0)

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const toAdd: UploadFile[] = Array.from(newFiles).map((file) => {
      const validationError = validateFile(file)
      return {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        file,
        progress: 0,
        status: validationError ? 'error' as const : 'pending' as const,
        error: validationError ?? undefined,
      }
    })
    setFiles((prev) => [...prev, ...toAdd])
  }, [])

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }

  const uploadFile = async (uploadFile: UploadFile) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === uploadFile.id ? { ...f, status: 'uploading' as const, progress: 0 } : f
      )
    )

    try {
      const formData = new FormData()
      formData.append('file', uploadFile.file)

      // Simulate progress since fetch doesn't support upload progress natively
      const progressInterval = setInterval(() => {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id && f.progress < 90
              ? { ...f, progress: f.progress + 10 }
              : f
          )
        )
      }, 200)

      const res = await fetch(`/api/tasks/${taskId}/attachments`, {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao enviar arquivo')
      }

      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id
            ? { ...f, status: 'success' as const, progress: 100 }
            : f
        )
      )

      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido'
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id
            ? { ...f, status: 'error' as const, error: message, progress: 0 }
            : f
        )
      )
      return false
    }
  }

  const handleUploadAll = async () => {
    const pending = files.filter((f) => f.status === 'pending')
    if (pending.length === 0) return

    let successCount = 0
    for (const f of pending) {
      const ok = await uploadFile(f)
      if (ok) successCount++
    }

    if (successCount > 0) {
      notifySuccess(`${successCount} arquivo${successCount > 1 ? 's' : ''} enviado${successCount > 1 ? 's' : ''}`)
      onUploadComplete()

      // Clear successful uploads after a short delay
      setTimeout(() => {
        setFiles((prev) => prev.filter((f) => f.status !== 'success'))
      }, 2000)
    }

    const failedCount = pending.length - successCount
    if (failedCount > 0) {
      notifyError('Erro no upload', `${failedCount} arquivo${failedCount > 1 ? 's' : ''} falharam`)
    }
  }

  // Drag and Drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCountRef.current++
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCountRef.current--
    if (dragCountRef.current === 0) {
      setIsDragging(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCountRef.current = 0
    setIsDragging(false)

    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files)
      // Reset input so same file can be re-selected
      e.target.value = ''
    }
  }

  const pendingCount = files.filter((f) => f.status === 'pending').length
  const uploadingCount = files.filter((f) => f.status === 'uploading').length

  return (
    <div className="space-y-3">
      {/* Drop Zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed
          py-6 px-4 cursor-pointer transition-colors
          ${isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-accent/5'
          }
        `}
      >
        <Upload className={`h-6 w-6 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
        <div className="text-center">
          <p className="text-sm font-medium">
            {isDragging ? 'Solte os arquivos aqui' : 'Arraste arquivos ou clique para enviar'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Imagens, PDFs, documentos, planilhas (max 10MB)
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          onChange={handleInputChange}
          className="hidden"
          accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.json,.md,.zip,.rar,.gz"
        />
      </div>

      {/* File Queue */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f) => (
            <div
              key={f.id}
              className="flex items-center gap-3 rounded-md border p-2 text-sm"
            >
              {/* Status indicator */}
              <div className="flex-shrink-0">
                {f.status === 'uploading' && (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                )}
                {f.status === 'success' && (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                )}
                {f.status === 'error' && (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
                {f.status === 'pending' && (
                  <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                )}
              </div>

              {/* File info */}
              <div className="flex-1 min-w-0">
                <p className="truncate text-xs font-medium">{f.file.name}</p>
                {f.status === 'error' ? (
                  <p className="text-xs text-red-600">{f.error}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(f.file.size)}
                  </p>
                )}
              </div>

              {/* Progress bar */}
              {f.status === 'uploading' && (
                <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${f.progress}%` }}
                  />
                </div>
              )}

              {/* Remove button */}
              {(f.status === 'pending' || f.status === 'error' || f.status === 'success') && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    removeFile(f.id)
                  }}
                  className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}

          {/* Upload All Button */}
          {pendingCount > 0 && (
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                handleUploadAll()
              }}
              disabled={uploadingCount > 0}
              className="w-full"
            >
              {uploadingCount > 0 ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                  Enviar {pendingCount} arquivo{pendingCount > 1 ? 's' : ''}
                </>
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
