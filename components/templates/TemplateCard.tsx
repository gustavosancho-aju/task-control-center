'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  FileText,
  Bot,
  Hash,
  TrendingUp,
  Play,
  Loader2,
  Shield,
  Crown,
  Cpu,
  Palette,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { notifySuccess, notifyError } from '@/lib/notifications'
import { ROLE_COLORS } from '@/lib/colors'

export interface TemplateData {
  id: string
  name: string
  description: string | null
  defaultTitle: string
  defaultDescription: string | null
  defaultPriority: string
  defaultAgentRole: string | null
  defaultTags: string[]
  subtaskTemplates: { title: string; description?: string; priority?: string }[] | null
  isActive: boolean
  usageCount: number
  createdAt: string
  updatedAt: string
}

interface TemplateCardProps {
  template: TemplateData
  onUsed?: () => void
}

const ROLE_CONFIG: Record<string, { label: string; icon: typeof Bot; color: string }> = {
  MAESTRO: { label: 'Maestro', icon: Crown, color: ROLE_COLORS.MAESTRO.soft },
  SENTINEL: { label: 'Sentinel', icon: Shield, color: ROLE_COLORS.SENTINEL.soft },
  ARCHITECTON: { label: 'Architecton', icon: Cpu, color: ROLE_COLORS.ARCHITECTON.soft },
  PIXEL: { label: 'Pixel', icon: Palette, color: ROLE_COLORS.PIXEL.soft },
}

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
  URGENT: 'Urgente',
}

export function TemplateCard({ template, onUsed }: TemplateCardProps) {
  const router = useRouter()
  const [using, setUsing] = useState(false)

  const roleConfig = template.defaultAgentRole
    ? ROLE_CONFIG[template.defaultAgentRole]
    : null

  const RoleIcon = roleConfig?.icon ?? Bot

  const subtaskCount = Array.isArray(template.subtaskTemplates)
    ? template.subtaskTemplates.length
    : 0

  const handleUse = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setUsing(true)
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
      onUsed?.()
      router.push(`/tasks/${data.data.task.id}`)
    } catch {
      notifyError('Erro', 'Não foi possível criar a tarefa.')
    } finally {
      setUsing(false)
    }
  }

  return (
    <Card
      className="group cursor-pointer hover:shadow-md transition-all hover:border-primary/30"
      onClick={() => router.push(`/templates/${template.id}`)}
    >
      <CardContent className="p-5 space-y-3">
        {/* Header: Name + Use Button */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5 min-w-0">
            <FileText className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <h3 className="font-semibold text-sm leading-tight truncate">
                {template.name}
              </h3>
              {template.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {template.description}
                </p>
              )}
            </div>
          </div>
          <Button
            size="sm"
            className="h-7 px-2.5 text-xs flex-shrink-0"
            onClick={handleUse}
            disabled={using}
          >
            {using ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <Play className="h-3 w-3 mr-1" />
            )}
            Usar
          </Button>
        </div>

        {/* Tags */}
        {template.defaultTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {template.defaultTags.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="text-[10px] px-1.5 py-0 h-5"
              >
                <Hash className="h-2.5 w-2.5 mr-0.5" />
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Footer: Agent, Priority, Subtasks, Usage */}
        <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
          {roleConfig && (
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border ${roleConfig.color}`}>
              <RoleIcon className="h-3 w-3" />
              {roleConfig.label}
            </span>
          )}
          <span>
            {PRIORITY_LABELS[template.defaultPriority] || template.defaultPriority}
          </span>
          {subtaskCount > 0 && (
            <span>
              {subtaskCount} subtarefa{subtaskCount > 1 ? 's' : ''}
            </span>
          )}
          <span className="inline-flex items-center gap-1 ml-auto">
            <TrendingUp className="h-3 w-3" />
            {template.usageCount}x
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
