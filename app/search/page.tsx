"use client"

import { useState, useEffect, useCallback, useRef, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Header } from "@/components/layout/Header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/components/tasks/StatusBadge"
import { PriorityBadge } from "@/components/tasks/PriorityBadge"
import {
  Search,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Bot,
  Tag,
  FileText,
  X,
  Loader2,
  MessageSquare,
  Hash,
  SlidersHorizontal,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TaskResult {
  type: "task"
  id: string
  title: string
  description?: string | null
  status: string
  priority: string
  createdAt: string
  updatedAt: string
  agent?: { id: string; name: string; role: string } | null
  tags?: { id: string; name: string; color: string }[]
  _count?: { subtasks: number; comments: number }
  relevance: number
}

interface AgentResult {
  type: "agent"
  id: string
  name: string
  role: string
  description?: string | null
  isActive: boolean
  skills: string[]
  _count?: { tasks: number }
  relevance: number
}

interface TagResult {
  type: "tag"
  id: string
  name: string
  color: string
  description?: string | null
  _count?: { tasks: number }
  relevance: number
}

interface TemplateResult {
  type: "template"
  id: string
  name: string
  description?: string | null
  defaultTitle: string
  defaultPriority: string
  isActive: boolean
  usageCount: number
  relevance: number
}

type AnyResult = TaskResult | AgentResult | TagResult | TemplateResult

interface SearchResponse {
  success: boolean
  query: string
  totalResults: number
  results: {
    tasks?: { items: TaskResult[]; total: number }
    agents?: { items: AgentResult[]; total: number }
    tags?: { items: TagResult[]; total: number }
    templates?: { items: TemplateResult[]; total: number }
  }
}

type FilterType = "all" | "task" | "agent" | "tag" | "template"

const STATUSES = ["TODO", "IN_PROGRESS", "REVIEW", "DONE", "BLOCKED"] as const
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const

const TYPE_CONFIG = {
  all: { label: "Todos", icon: Search },
  task: { label: "Tarefas", icon: CheckSquare },
  agent: { label: "Agentes", icon: Bot },
  tag: { label: "Tags", icon: Tag },
  template: { label: "Templates", icon: FileText },
} as const

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query || !text) return text
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const regex = new RegExp(`(${escaped})`, "gi")
  const parts = text.split(regex)
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-yellow-200 text-yellow-900 dark:bg-yellow-800/60 dark:text-yellow-200 rounded-sm px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  )
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-muted/30">
        <Header />
        <main className="container mx-auto px-4 py-6 max-w-4xl">
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </main>
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  )
}

function SearchPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [query, setQuery] = useState(searchParams.get("q") || "")
  const [activeType, setActiveType] = useState<FilterType>(
    (searchParams.get("type") as FilterType) || "all"
  )
  const [status, setStatus] = useState<string | undefined>(
    searchParams.get("status") || undefined
  )
  const [priority, setPriority] = useState<string | undefined>(
    searchParams.get("priority") || undefined
  )
  const [showFilters, setShowFilters] = useState(false)

  const [data, setData] = useState<SearchResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(0)
  const limit = 20

  const inputRef = useRef<HTMLInputElement>(null)

  // Executar busca
  const doSearch = useCallback(
    async (q: string, type: FilterType, p: number) => {
      if (!q.trim() || q.trim().length < 2) {
        setData(null)
        return
      }

      setLoading(true)
      try {
        const params = new URLSearchParams({
          q: q.trim(),
          limit: String(limit),
          offset: String(p * limit),
        })
        if (type !== "all") params.set("type", type)
        if (status) params.set("status", status)
        if (priority) params.set("priority", priority)

        const res = await fetch(`/api/search?${params}`)
        const json = await res.json()
        if (json.success) {
          setData(json)
        }
      } catch {
        // fail silently
      } finally {
        setLoading(false)
      }
    },
    [status, priority]
  )

  // Buscar ao carregar com params da URL
  useEffect(() => {
    const q = searchParams.get("q")
    if (q) {
      setQuery(q)
      doSearch(q, activeType, 0)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-buscar ao mudar filtros
  useEffect(() => {
    if (query.trim().length >= 2) {
      setPage(0)
      doSearch(query, activeType, 0)
    }
  }, [activeType, status, priority]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(0)
    doSearch(query, activeType, 0)
    // Atualizar URL sem reload
    const params = new URLSearchParams()
    params.set("q", query)
    if (activeType !== "all") params.set("type", activeType)
    if (status) params.set("status", status)
    if (priority) params.set("priority", priority)
    router.replace(`/search?${params}`, { scroll: false })
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    doSearch(query, activeType, newPage)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  // Exportar resultados como JSON
  const handleExport = () => {
    if (!data) return
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `busca-${query.replace(/\s+/g, "-")}-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const clearFilters = () => {
    setStatus(undefined)
    setPriority(undefined)
    setActiveType("all")
  }

  const hasActiveFilters = activeType !== "all" || status || priority

  // Flatten todos os resultados para exibição
  const allResults: AnyResult[] = []
  if (data?.results) {
    if (data.results.tasks) allResults.push(...data.results.tasks.items)
    if (data.results.agents) allResults.push(...data.results.agents.items)
    if (data.results.tags) allResults.push(...data.results.tags.items)
    if (data.results.templates) allResults.push(...data.results.templates.items)
  }

  // Contadores por tipo
  const counts = {
    all: data?.totalResults ?? 0,
    task: data?.results?.tasks?.total ?? 0,
    agent: data?.results?.agents?.total ?? 0,
    tag: data?.results?.tags?.total ?? 0,
    template: data?.results?.templates?.total ?? 0,
  }

  const currentTotal = activeType === "all" ? counts.all : counts[activeType]
  const totalPages = Math.ceil(currentTotal / limit)

  return (
    <div className="min-h-screen bg-muted/30">
      <Header />

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Search header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-4">Busca Avançada</h1>

          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar em tarefas, agentes, tags, templates..."
                className="pl-10 h-11"
                autoFocus
              />
            </div>
            <Button type="submit" className="h-11 px-6">
              Buscar
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11"
              onClick={() => setShowFilters((p) => !p)}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </form>

          {/* Type tabs */}
          <div className="flex items-center gap-1 mt-4 overflow-x-auto pb-1">
            {(Object.keys(TYPE_CONFIG) as (FilterType)[]).map((type) => {
              const cfg = TYPE_CONFIG[type]
              const Icon = cfg.icon
              const count = counts[type]

              return (
                <Button
                  key={type}
                  variant={activeType === type ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveType(type)}
                  className="gap-1.5 shrink-0"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {cfg.label}
                  {data && (
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-full",
                      activeType === type
                        ? "bg-background/20"
                        : "bg-muted"
                    )}>
                      {count}
                    </span>
                  )}
                </Button>
              )
            })}
          </div>

          {/* Advanced filters */}
          {showFilters && (
            <Card className="mt-3">
              <CardContent className="pt-4 pb-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                      Status
                    </label>
                    <select
                      value={status || ""}
                      onChange={(e) => setStatus(e.target.value || undefined)}
                      className="w-full h-9 rounded-md border px-3 text-sm bg-background"
                    >
                      <option value="">Todos</option>
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                      Prioridade
                    </label>
                    <select
                      value={priority || ""}
                      onChange={(e) => setPriority(e.target.value || undefined)}
                      className="w-full h-9 rounded-md border px-3 text-sm bg-background"
                    >
                      <option value="">Todas</option>
                      {PRIORITIES.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      disabled={!hasActiveFilters}
                    >
                      <X className="h-3.5 w-3.5 mr-1" />
                      Limpar filtros
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Active filter badges */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 mt-3">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              {activeType !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  {TYPE_CONFIG[activeType].label}
                  <button onClick={() => setActiveType("all")}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {status && (
                <Badge variant="secondary" className="gap-1">
                  {status}
                  <button onClick={() => setStatus(undefined)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {priority && (
                <Badge variant="secondary" className="gap-1">
                  {priority}
                  <button onClick={() => setPriority(undefined)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Results */}
        {!loading && data && (
          <>
            {/* Results header */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                {currentTotal} resultado{currentTotal !== 1 ? "s" : ""} para &ldquo;{data.query}&rdquo;
              </p>
              {currentTotal > 0 && (
                <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
                  <Download className="h-3.5 w-3.5" />
                  Exportar
                </Button>
              )}
            </div>

            {/* Result cards */}
            <div className="space-y-2">
              {allResults.map((item) => (
                <ResultCard key={`${item.type}-${item.id}`} item={item} query={query} />
              ))}
            </div>

            {/* No results */}
            {allResults.length === 0 && (
              <div className="text-center py-12">
                <Search className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Nenhum resultado encontrado para &ldquo;{data.query}&rdquo;
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Tente usar termos diferentes ou remover filtros
                </p>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => handlePageChange(page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <span className="text-sm text-muted-foreground px-3">
                  {page + 1} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => handlePageChange(page + 1)}
                >
                  Próxima
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}

        {/* Empty state when no search performed */}
        {!loading && !data && (
          <div className="text-center py-16">
            <Search className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-lg text-muted-foreground">
              Digite pelo menos 2 caracteres para buscar
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Busca em tarefas, agentes, tags e templates
            </p>
          </div>
        )}
      </main>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Result card
// ---------------------------------------------------------------------------

function ResultCard({ item, query }: { item: AnyResult; query: string }) {
  const router = useRouter()

  const handleClick = () => {
    switch (item.type) {
      case "task":
        router.push(`/tasks/${item.id}`)
        break
      case "agent":
        router.push(`/agents`)
        break
      case "tag":
        router.push(`/search?q=${encodeURIComponent(item.name)}&type=task`)
        break
      case "template":
        router.push(`/templates`)
        break
    }
  }

  if (item.type === "task") {
    const task = item as TaskResult
    return (
      <Card
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={handleClick}
      >
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <CheckSquare className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium">
                  {highlightMatch(task.title, query)}
                </p>
                <StatusBadge status={task.status as any} />
                <PriorityBadge priority={task.priority as any} />
              </div>
              {task.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {highlightMatch(task.description, query)}
                </p>
              )}
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                {task.agent && (
                  <span className="inline-flex items-center gap-1">
                    <Bot className="h-3 w-3" />
                    {task.agent.name}
                  </span>
                )}
                {task.tags && task.tags.length > 0 && (
                  <span className="inline-flex items-center gap-1">
                    {task.tags.map((t) => (
                      <Badge key={t.id} variant="outline" className="text-[10px] px-1.5 py-0 h-4 gap-1">
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: t.color }}
                        />
                        {t.name}
                      </Badge>
                    ))}
                  </span>
                )}
                {task._count?.subtasks ? (
                  <span>{task._count.subtasks} subtarefas</span>
                ) : null}
                {task._count?.comments ? (
                  <span className="inline-flex items-center gap-0.5">
                    <MessageSquare className="h-3 w-3" />
                    {task._count.comments}
                  </span>
                ) : null}
                {task.updatedAt && (
                  <span>Atualizado em {formatDate(task.updatedAt)}</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (item.type === "agent") {
    const agent = item as AgentResult
    return (
      <Card
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={handleClick}
      >
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-9 w-9 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 text-sm font-bold shrink-0">
              {agent.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">
                  {highlightMatch(agent.name, query)}
                </p>
                <Badge variant="outline" className="text-[10px]">{agent.role}</Badge>
                {!agent.isActive && (
                  <Badge variant="secondary" className="text-[10px]">Inativo</Badge>
                )}
              </div>
              {agent.description && (
                <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                  {highlightMatch(agent.description, query)}
                </p>
              )}
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <span>{agent._count?.tasks ?? 0} tarefas</span>
                {agent.skills.length > 0 && (
                  <span>{agent.skills.slice(0, 3).join(", ")}</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (item.type === "tag") {
    const tag = item as TagResult
    return (
      <Card
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={handleClick}
      >
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <span
              className="inline-block h-4 w-4 rounded-full shrink-0"
              style={{ backgroundColor: tag.color }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">
                {highlightMatch(tag.name, query)}
              </p>
              {tag.description && (
                <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                  {highlightMatch(tag.description, query)}
                </p>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              <Hash className="inline h-3 w-3" /> {tag._count?.tasks ?? 0} tarefas
            </span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (item.type === "template") {
    const tpl = item as TemplateResult
    return (
      <Card
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={handleClick}
      >
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">
                  {highlightMatch(tpl.name, query)}
                </p>
                {!tpl.isActive && (
                  <Badge variant="secondary" className="text-[10px]">Inativo</Badge>
                )}
              </div>
              {tpl.description && (
                <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                  {highlightMatch(tpl.description, query)}
                </p>
              )}
            </div>
            <span className="text-xs text-muted-foreground shrink-0">
              {tpl.usageCount}x usado
            </span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return null
}
