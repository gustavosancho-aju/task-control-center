'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  FileText,
  Loader2,
  Play,
  Hash,
  TrendingUp,
  Crown,
  Shield,
  Cpu,
  Palette,
  Bot,
  Search,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { notifySuccess, notifyError } from '@/lib/notifications'
import type { TemplateData } from './TemplateCard'

interface TemplatePickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const ROLE_ICONS: Record<string, typeof Bot> = {
  MAESTRO: Crown,
  SENTINEL: Shield,
  ARCHITECTON: Cpu,
  PIXEL: Palette,
}

export function TemplatePicker({ open, onOpenChange }: TemplatePickerProps) {
  const router = useRouter()
  const [templates, setTemplates] = useState<TemplateData[]>([])
  const [loading, setLoading] = useState(true)
  const [using, setUsing] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch('/api/templates')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setTemplates(d.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open])

  const filtered = templates.filter((t) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      t.name.toLowerCase().includes(q) ||
      t.defaultTitle.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q)
    )
  })

  const handleUse = async (template: TemplateData) => {
    setUsing(template.id)
    try {
      const res = await fetch(`/api/templates/${template.id}/use`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        notifyError('Erro ao usar template', data.error)
        return
      }
      notifySuccess('Tarefa criada', `"${data.data.task.title}" criada a partir de "${template.name}"`)
      onOpenChange(false)
      router.push(`/tasks/${data.data.task.id}`)
    } catch {
      notifyError('Erro', 'Não foi possível criar a tarefa.')
    } finally {
      setUsing(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Usar Template
          </DialogTitle>
          <DialogDescription>
            Selecione um template para criar uma tarefa rapidamente
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar template..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto -mx-6 px-6 space-y-2">
          {loading ? (
            <div className="py-8 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {templates.length === 0
                ? 'Nenhum template disponível'
                : 'Nenhum template encontrado'}
            </div>
          ) : (
            filtered.map((template) => {
              const RoleIcon = template.defaultAgentRole
                ? ROLE_ICONS[template.defaultAgentRole] ?? Bot
                : null
              const subtaskCount = Array.isArray(template.subtaskTemplates)
                ? template.subtaskTemplates.length
                : 0

              return (
                <div
                  key={template.id}
                  className="flex items-start gap-3 rounded-lg border p-3 hover:bg-accent/5 transition-colors"
                >
                  <FileText className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{template.name}</p>
                    {template.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {template.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {RoleIcon && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <RoleIcon className="h-3 w-3" />
                          {template.defaultAgentRole}
                        </span>
                      )}
                      {template.defaultTags.slice(0, 3).map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="text-[10px] px-1 py-0 h-4"
                        >
                          {tag}
                        </Badge>
                      ))}
                      {subtaskCount > 0 && (
                        <span className="text-[10px] text-muted-foreground">
                          +{subtaskCount} subtarefa{subtaskCount > 1 ? 's' : ''}
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 ml-auto">
                        <TrendingUp className="h-2.5 w-2.5" />
                        {template.usageCount}x
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="h-7 px-2.5 text-xs flex-shrink-0"
                    onClick={() => handleUse(template)}
                    disabled={using === template.id}
                  >
                    {using === template.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Play className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              )
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
