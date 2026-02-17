'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Play,
  Pencil,
  Trash2,
  FileText,
  TrendingUp,
  Hash,
  Crown,
  Shield,
  Cpu,
  Palette,
  Bot,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { TemplateForm } from '@/components/templates/TemplateForm'
import type { TemplateData } from '@/components/templates/TemplateCard'
import { notifySuccess, notifyError } from '@/lib/notifications'
import { ROLE_COLORS, PRIORITY_COLORS, SEMANTIC_COLORS } from '@/lib/colors'

const ROLE_CONFIG: Record<string, { label: string; icon: typeof Bot; color: string }> = {
  MAESTRO: { label: 'Maestro', icon: Crown, color: ROLE_COLORS.MAESTRO.soft },
  SENTINEL: { label: 'Sentinel', icon: Shield, color: ROLE_COLORS.SENTINEL.soft },
  ARCHITECTON: { label: 'Architecton', icon: Cpu, color: ROLE_COLORS.ARCHITECTON.soft },
  PIXEL: { label: 'Pixel', icon: Palette, color: ROLE_COLORS.PIXEL.soft },
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  LOW: { label: 'Baixa', color: PRIORITY_COLORS.LOW.labeled },
  MEDIUM: { label: 'Média', color: PRIORITY_COLORS.MEDIUM.labeled },
  HIGH: { label: 'Alta', color: PRIORITY_COLORS.HIGH.labeled },
  URGENT: { label: 'Urgente', color: PRIORITY_COLORS.URGENT.labeled },
}

export default function TemplateDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const templateId = params.id

  const [template, setTemplate] = useState<TemplateData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [using, setUsing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const fetchTemplate = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/templates/${templateId}`)
      if (res.status === 404) {
        setError('Template não encontrado')
        return
      }
      if (!res.ok) throw new Error('Erro ao buscar template')
      const data = await res.json()
      if (data.success) setTemplate(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [templateId])

  useEffect(() => {
    fetchTemplate()
  }, [fetchTemplate])

  const handleUse = async () => {
    setUsing(true)
    try {
      const res = await fetch(`/api/templates/${templateId}/use`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        notifyError('Erro ao usar template', data.error)
        return
      }
      notifySuccess('Tarefa criada', `"${data.data.task.title}" criada com sucesso!`)
      router.push(`/tasks/${data.data.task.id}`)
    } catch {
      notifyError('Erro', 'Não foi possível criar a tarefa.')
    } finally {
      setUsing(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Deseja desativar este template?')) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/templates/${templateId}`, { method: 'DELETE' })
      if (res.ok) {
        notifySuccess('Template desativado')
        router.push('/templates')
      }
    } catch {
      notifyError('Erro', 'Não foi possível desativar o template.')
    } finally {
      setDeleting(false)
    }
  }

  const handleEdit = async (data: {
    name: string
    description: string
    defaultTitle: string
    defaultDescription: string
    defaultPriority: string
    defaultAgentRole: string
    defaultTags: string[]
    subtaskTemplates: { title: string; description?: string; priority?: string }[]
  }) => {
    try {
      const res = await fetch(`/api/templates/${templateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          defaultAgentRole: data.defaultAgentRole === 'none' || !data.defaultAgentRole ? null : data.defaultAgentRole,
          subtaskTemplates: data.subtaskTemplates.length > 0 ? data.subtaskTemplates : null,
        }),
      })
      const result = await res.json()
      if (!res.ok || !result.success) {
        notifyError('Erro ao atualizar', result.error)
        return
      }
      notifySuccess('Template atualizado')
      setTemplate(result.data)
      setEditing(false)
    } catch {
      notifyError('Erro', 'Não foi possível atualizar o template.')
    }
  }

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </main>
      </div>
    )
  }

  // Error
  if (error || !template) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Card className="border-destructive">
              <CardContent className="py-12 text-center space-y-4">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
                <h2 className="text-2xl font-bold text-destructive">
                  {error || 'Template não encontrado'}
                </h2>
                <Button onClick={() => router.push('/templates')}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar para Templates
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    )
  }

  // Edit mode
  if (editing) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 max-w-3xl">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditing(false)}
            className="gap-2 mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Cancelar Edição
          </Button>

          <div className="mb-6">
            <h1 className="text-3xl font-bold tracking-tight">Editar Template</h1>
            <p className="text-muted-foreground mt-1">"{template.name}"</p>
          </div>

          <TemplateForm
            initialData={template}
            onSubmit={handleEdit}
            onCancel={() => setEditing(false)}
            submitLabel="Salvar Alterações"
          />
        </main>
      </div>
    )
  }

  // Detail view
  const roleConfig = template.defaultAgentRole ? ROLE_CONFIG[template.defaultAgentRole] : null
  const priorityConfig = PRIORITY_CONFIG[template.defaultPriority]
  const subtasks = (template.subtaskTemplates as { title: string; description?: string; priority?: string }[]) || []

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Back */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/templates')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>

          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <FileText className="h-7 w-7 text-primary" />
                {template.name}
              </h1>
              {template.description && (
                <p className="text-muted-foreground">{template.description}</p>
              )}
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5" />
                  {template.usageCount} uso{template.usageCount !== 1 ? 's' : ''}
                </span>
                <span>
                  Criado em{' '}
                  {format(new Date(template.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                </span>
              </div>
            </div>

            <div className="flex gap-2 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing(true)}
              >
                <Pencil className="h-4 w-4 mr-1" />
                Editar
              </Button>
              <Button size="sm" onClick={handleUse} disabled={using}>
                {using ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-1" />
                )}
                Usar Template
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Task Preview */}
              <Card>
                <CardHeader>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Preview da Tarefa
                  </p>
                  <CardTitle>{template.defaultTitle}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {template.defaultDescription && (
                    <p className="text-sm whitespace-pre-wrap">{template.defaultDescription}</p>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    {priorityConfig && (
                      <Badge
                        variant="outline"
                        className={`border ${priorityConfig.color}`}
                      >
                        {priorityConfig.label}
                      </Badge>
                    )}
                    {template.defaultTags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        <Hash className="h-3 w-3 mr-0.5" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Subtasks */}
              {subtasks.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Subtarefas ({subtasks.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {subtasks.map((st, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-3 rounded-md border p-3"
                        >
                          <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{st.title}</p>
                            {st.description && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {st.description}
                              </p>
                            )}
                          </div>
                          {st.priority && (
                            <Badge variant="outline" className="text-xs flex-shrink-0">
                              {PRIORITY_CONFIG[st.priority]?.label || st.priority}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Agent */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Agente Sugerido</CardTitle>
                </CardHeader>
                <CardContent>
                  {roleConfig ? (
                    <div
                      className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 ${roleConfig.color}`}
                    >
                      <roleConfig.icon className="h-4 w-4" />
                      <span className="font-medium text-sm">{roleConfig.label}</span>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhum agente definido</p>
                  )}
                </CardContent>
              </Card>

              {/* Meta */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Informações</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <Badge variant={template.isActive ? 'default' : 'secondary'}>
                      {template.isActive ? 'Ativo' : 'Desativado'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Última atualização</p>
                    <p>
                      {format(new Date(template.updatedAt), "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                  <Separator />
                  <Button
                    variant="outline"
                    size="sm"
                    className={`w-full ${SEMANTIC_COLORS.destructiveButton}`}
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-1" />
                    )}
                    Desativar Template
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
