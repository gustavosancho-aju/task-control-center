'use client'

import { useState } from 'react'
import {
  Plus,
  Trash2,
  Loader2,
  Save,
  Eye,
  EyeOff,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { TemplateData } from './TemplateCard'
import { SEMANTIC_COLORS } from '@/lib/colors'

interface SubtaskTemplate {
  title: string
  description?: string
  priority?: string
}

interface TemplateFormData {
  name: string
  description: string
  defaultTitle: string
  defaultDescription: string
  defaultPriority: string
  defaultAgentRole: string
  defaultTags: string[]
  subtaskTemplates: SubtaskTemplate[]
}

interface TemplateFormProps {
  initialData?: TemplateData
  onSubmit: (data: TemplateFormData) => Promise<void>
  onCancel?: () => void
  submitLabel?: string
}

const AVAILABLE_TAGS = [
  'Bug', 'Feature', 'Improvement', 'Documentation',
  'Urgent', 'Backend', 'Frontend', 'DevOps',
]

export function TemplateForm({
  initialData,
  onSubmit,
  onCancel,
  submitLabel = 'Salvar',
}: TemplateFormProps) {
  const [name, setName] = useState(initialData?.name ?? '')
  const [description, setDescription] = useState(initialData?.description ?? '')
  const [defaultTitle, setDefaultTitle] = useState(initialData?.defaultTitle ?? '')
  const [defaultDescription, setDefaultDescription] = useState(
    initialData?.defaultDescription ?? ''
  )
  const [defaultPriority, setDefaultPriority] = useState(
    initialData?.defaultPriority ?? 'MEDIUM'
  )
  const [defaultAgentRole, setDefaultAgentRole] = useState(
    initialData?.defaultAgentRole ?? ''
  )
  const [defaultTags, setDefaultTags] = useState<string[]>(
    initialData?.defaultTags ?? []
  )
  const [subtaskTemplates, setSubtaskTemplates] = useState<SubtaskTemplate[]>(
    (initialData?.subtaskTemplates as SubtaskTemplate[]) ?? []
  )
  const [showPreview, setShowPreview] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const toggleTag = (tag: string) => {
    setDefaultTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  const addSubtask = () => {
    setSubtaskTemplates((prev) => [...prev, { title: '', description: '', priority: 'MEDIUM' }])
  }

  const updateSubtask = (index: number, field: keyof SubtaskTemplate, value: string) => {
    setSubtaskTemplates((prev) =>
      prev.map((st, i) => (i === index ? { ...st, [field]: value } : st))
    )
  }

  const removeSubtask = (index: number) => {
    setSubtaskTemplates((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !defaultTitle.trim()) return

    setSubmitting(true)
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim(),
        defaultTitle: defaultTitle.trim(),
        defaultDescription: defaultDescription.trim(),
        defaultPriority,
        defaultAgentRole: defaultAgentRole || '',
        defaultTags,
        subtaskTemplates: subtaskTemplates.filter((st) => st.title.trim()),
      })
    } finally {
      setSubmitting(false)
    }
  }

  const PRIORITY_LABELS: Record<string, string> = {
    LOW: 'Baixa',
    MEDIUM: 'Média',
    HIGH: 'Alta',
    URGENT: 'Urgente',
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Template Identity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Identidade do Template</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Template *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Bug Report"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve descrição do propósito deste template"
              rows={2}
              className="resize-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* Default Task Values */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Valores Padrão da Tarefa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="defaultTitle">Título Padrão *</Label>
            <Input
              id="defaultTitle"
              value={defaultTitle}
              onChange={(e) => setDefaultTitle(e.target.value)}
              placeholder="Ex: [BUG] Descrição do bug"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="defaultDescription">Descrição Padrão</Label>
            <Textarea
              id="defaultDescription"
              value={defaultDescription}
              onChange={(e) => setDefaultDescription(e.target.value)}
              placeholder="Template da descrição da tarefa..."
              rows={4}
              className="resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select value={defaultPriority} onValueChange={setDefaultPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Baixa</SelectItem>
                  <SelectItem value="MEDIUM">Média</SelectItem>
                  <SelectItem value="HIGH">Alta</SelectItem>
                  <SelectItem value="URGENT">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Agente Sugerido</Label>
              <Select value={defaultAgentRole} onValueChange={setDefaultAgentRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Nenhum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  <SelectItem value="MAESTRO">Maestro</SelectItem>
                  <SelectItem value="SENTINEL">Sentinel</SelectItem>
                  <SelectItem value="ARCHITECTON">Architecton</SelectItem>
                  <SelectItem value="PIXEL">Pixel</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags Padrão</Label>
            <div className="flex flex-wrap gap-1.5">
              {AVAILABLE_TAGS.map((tag) => {
                const selected = defaultTags.includes(tag)
                return (
                  <Badge
                    key={tag}
                    variant={selected ? 'default' : 'outline'}
                    className={`cursor-pointer transition-colors text-xs ${
                      selected ? '' : 'hover:bg-accent'
                    }`}
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </Badge>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subtask Templates */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base">Subtarefas</CardTitle>
          <Button type="button" size="sm" variant="outline" onClick={addSubtask}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Adicionar
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {subtaskTemplates.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma subtarefa definida. Clique em "Adicionar" para criar.
            </p>
          ) : (
            subtaskTemplates.map((st, index) => (
              <div key={index} className="flex gap-2 items-start rounded-md border p-3">
                <div className="flex-1 space-y-2">
                  <Input
                    value={st.title}
                    onChange={(e) => updateSubtask(index, 'title', e.target.value)}
                    placeholder="Título da subtarefa"
                    className="text-sm h-8"
                  />
                  <div className="flex gap-2">
                    <Input
                      value={st.description ?? ''}
                      onChange={(e) => updateSubtask(index, 'description', e.target.value)}
                      placeholder="Descrição (opcional)"
                      className="text-sm h-8 flex-1"
                    />
                    <Select
                      value={st.priority ?? 'MEDIUM'}
                      onValueChange={(v) => updateSubtask(index, 'priority', v)}
                    >
                      <SelectTrigger className="h-8 w-28 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW">Baixa</SelectItem>
                        <SelectItem value="MEDIUM">Média</SelectItem>
                        <SelectItem value="HIGH">Alta</SelectItem>
                        <SelectItem value="URGENT">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className={`h-8 w-8 p-0 ${SEMANTIC_COLORS.destructiveHover}`}
                  onClick={() => removeSubtask(index)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Preview */}
      <div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowPreview(!showPreview)}
          className="text-xs text-muted-foreground mb-2"
        >
          {showPreview ? (
            <><EyeOff className="h-3 w-3 mr-1" /> Esconder Preview</>
          ) : (
            <><Eye className="h-3 w-3 mr-1" /> Ver Preview da Tarefa</>
          )}
        </Button>

        {showPreview && (
          <Card className="border-dashed">
            <CardHeader className="pb-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Preview da Tarefa
              </p>
              <CardTitle className="text-base">
                {defaultTitle || 'Título da tarefa'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {defaultDescription && (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {defaultDescription}
                </p>
              )}
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline">{PRIORITY_LABELS[defaultPriority]}</Badge>
                {defaultAgentRole && defaultAgentRole !== 'none' && (
                  <Badge variant="secondary">{defaultAgentRole}</Badge>
                )}
                {defaultTags.map((t) => (
                  <Badge key={t} variant="outline" className="text-xs">
                    {t}
                  </Badge>
                ))}
              </div>
              {subtaskTemplates.filter((s) => s.title.trim()).length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs font-medium mb-1">Subtarefas:</p>
                    <ul className="space-y-1">
                      {subtaskTemplates
                        .filter((s) => s.title.trim())
                        .map((s, i) => (
                          <li key={i} className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                            {s.title}
                          </li>
                        ))}
                    </ul>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={submitting || !name.trim() || !defaultTitle.trim()}>
          {submitting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
