'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  FileText,
  Plus,
  Loader2,
  Filter,
  Search,
} from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TemplateCard, type TemplateData } from '@/components/templates/TemplateCard'

export default function TemplatesPage() {
  const router = useRouter()
  const [templates, setTemplates] = useState<TemplateData[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [agentFilter, setAgentFilter] = useState('all')
  const [tagFilter, setTagFilter] = useState('all')

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (agentFilter !== 'all') params.set('agentRole', agentFilter)
      if (tagFilter !== 'all') params.set('tag', tagFilter)
      const res = await fetch(`/api/templates?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        if (data.success) setTemplates(data.data)
      }
    } catch (err) {
      console.error('Error fetching templates:', err)
    } finally {
      setLoading(false)
    }
  }, [agentFilter, tagFilter])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const filtered = templates.filter((t) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      t.name.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q) ||
      t.defaultTitle.toLowerCase().includes(q)
    )
  })

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <FileText className="h-8 w-8 text-primary" />
                Templates
              </h1>
              <p className="text-muted-foreground mt-1">
                Modelos reutilizáveis para criação rápida de tarefas
              </p>
            </div>
            <Button onClick={() => router.push('/templates/new')} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Novo Template
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar templates..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={agentFilter} onValueChange={setAgentFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Agente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Agentes</SelectItem>
                  <SelectItem value="MAESTRO">Maestro</SelectItem>
                  <SelectItem value="SENTINEL">Sentinel</SelectItem>
                  <SelectItem value="ARCHITECTON">Architecton</SelectItem>
                  <SelectItem value="PIXEL">Pixel</SelectItem>
                </SelectContent>
              </Select>

              <Select value={tagFilter} onValueChange={setTagFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Tags</SelectItem>
                  <SelectItem value="Bug">Bug</SelectItem>
                  <SelectItem value="Feature">Feature</SelectItem>
                  <SelectItem value="Improvement">Improvement</SelectItem>
                  <SelectItem value="Documentation">Documentation</SelectItem>
                  <SelectItem value="Backend">Backend</SelectItem>
                  <SelectItem value="Frontend">Frontend</SelectItem>
                  <SelectItem value="DevOps">DevOps</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(agentFilter !== 'all' || tagFilter !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setAgentFilter('all')
                  setTagFilter('all')
                }}
                className="text-xs"
              >
                Limpar filtros
              </Button>
            )}
          </div>

          {/* Active filter badges */}
          {(agentFilter !== 'all' || tagFilter !== 'all') && (
            <div className="flex gap-1.5">
              {agentFilter !== 'all' && (
                <Badge variant="secondary" className="text-xs">
                  Agente: {agentFilter}
                </Badge>
              )}
              {tagFilter !== 'all' && (
                <Badge variant="secondary" className="text-xs">
                  Tag: {tagFilter}
                </Badge>
              )}
            </div>
          )}

          {/* Templates Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <h3 className="text-lg font-medium">Nenhum template encontrado</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                {templates.length === 0
                  ? 'Crie seu primeiro template para começar.'
                  : 'Tente ajustar os filtros de busca.'}
              </p>
              {templates.length === 0 && (
                <Button onClick={() => router.push('/templates/new')}>
                  <Plus className="h-4 w-4 mr-1.5" />
                  Criar Template
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onUsed={fetchTemplates}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
