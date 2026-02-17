"use client"

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, Fragment } from "react"
import { useRouter } from "next/navigation"
import {
  CheckSquare,
  Bot,
  Tag,
  FileText,
  ArrowRight,
  Hash,
  MessageSquare,
} from "lucide-react"
import { StatusBadge } from "@/components/tasks/StatusBadge"
import { PriorityBadge } from "@/components/tasks/PriorityBadge"
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

type SearchResultItem = TaskResult | AgentResult | TagResult | TemplateResult

interface SearchResultsData {
  tasks?: { items: TaskResult[]; total: number }
  agents?: { items: AgentResult[]; total: number }
  tags?: { items: TagResult[]; total: number }
  templates?: { items: TemplateResult[]; total: number }
}

interface SearchResultsProps {
  results: SearchResultsData
  query: string
  activeIndex: number
  onSelect?: (item: SearchResultItem) => void
  onActiveIndexChange?: (index: number) => void
  compact?: boolean
}

export interface SearchResultsHandle {
  getTotalCount: () => number
  getItemAtIndex: (index: number) => SearchResultItem | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CATEGORY_CONFIG = {
  tasks: { label: "Tarefas", icon: CheckSquare, color: "text-blue-600" },
  agents: { label: "Agentes", icon: Bot, color: "text-purple-600" },
  tags: { label: "Tags", icon: Tag, color: "text-green-600" },
  templates: { label: "Templates", icon: FileText, color: "text-amber-600" },
} as const

type CategoryKey = keyof typeof CATEGORY_CONFIG

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query || !text) return text
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const regex = new RegExp(`(${escaped})`, "gi")
  const parts = text.split(regex)
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-yellow-200 text-yellow-900 rounded-sm px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  )
}

function truncate(text: string | null | undefined, max: number): string {
  if (!text) return ""
  return text.length > max ? text.slice(0, max) + "..." : text
}

function getItemRoute(item: SearchResultItem): string {
  switch (item.type) {
    case "task":
      return `/tasks/${item.id}`
    case "agent":
      return `/agents`
    case "tag":
      return `/search?q=${encodeURIComponent(item.name)}&type=task`
    case "template":
      return `/templates`
  }
}

function flattenResults(results: SearchResultsData): SearchResultItem[] {
  const flat: SearchResultItem[] = []
  const order: CategoryKey[] = ["tasks", "agents", "tags", "templates"]
  for (const key of order) {
    const group = results[key]
    if (group && group.items.length > 0) {
      flat.push(...group.items)
    }
  }
  return flat
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TaskResultRow({
  item,
  query,
  isActive,
  compact,
  onClick,
}: {
  item: TaskResult
  query: string
  isActive: boolean
  compact?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-2.5 flex items-start gap-3 transition-colors",
        isActive ? "bg-primary/10" : "hover:bg-muted/50"
      )}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium line-clamp-1">
          {highlightMatch(item.title, query)}
        </p>
        {!compact && item.description && (
          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
            {highlightMatch(truncate(item.description, 120), query)}
          </p>
        )}
        {!compact && (item.tags?.length || item._count?.comments) ? (
          <div className="flex items-center gap-2 mt-1">
            {item.tags?.slice(0, 3).map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center gap-1 text-[10px] text-muted-foreground"
              >
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ backgroundColor: tag.color }}
                />
                {tag.name}
              </span>
            ))}
            {item._count?.comments ? (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                <MessageSquare className="h-2.5 w-2.5" />
                {item._count.comments}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
        <StatusBadge status={item.status as any} />
        {!compact && <PriorityBadge priority={item.priority as any} />}
      </div>
      {isActive && <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />}
    </button>
  )
}

function AgentResultRow({
  item,
  query,
  isActive,
  onClick,
}: {
  item: AgentResult
  query: string
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-2.5 flex items-center gap-3 transition-colors",
        isActive ? "bg-primary/10" : "hover:bg-muted/50"
      )}
    >
      <div className="flex items-center justify-center h-7 w-7 rounded-full bg-purple-100 text-purple-700 text-xs font-bold shrink-0">
        {item.name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{highlightMatch(item.name, query)}</p>
        <p className="text-xs text-muted-foreground">
          {item.role} &middot; {item._count?.tasks ?? 0} tarefas
          {!item.isActive && " (inativo)"}
        </p>
      </div>
      {isActive && <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />}
    </button>
  )
}

function TagResultRow({
  item,
  query,
  isActive,
  onClick,
}: {
  item: TagResult
  query: string
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-2.5 flex items-center gap-3 transition-colors",
        isActive ? "bg-primary/10" : "hover:bg-muted/50"
      )}
    >
      <span
        className="inline-block h-3 w-3 rounded-full shrink-0"
        style={{ backgroundColor: item.color }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{highlightMatch(item.name, query)}</p>
        {item.description && (
          <p className="text-xs text-muted-foreground line-clamp-1">
            {highlightMatch(truncate(item.description, 80), query)}
          </p>
        )}
      </div>
      <span className="text-xs text-muted-foreground shrink-0">
        <Hash className="inline h-3 w-3" /> {item._count?.tasks ?? 0}
      </span>
      {isActive && <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />}
    </button>
  )
}

function TemplateResultRow({
  item,
  query,
  isActive,
  onClick,
}: {
  item: TemplateResult
  query: string
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-2.5 flex items-center gap-3 transition-colors",
        isActive ? "bg-primary/10" : "hover:bg-muted/50"
      )}
    >
      <FileText className="h-4 w-4 text-amber-600 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{highlightMatch(item.name, query)}</p>
        {item.description && (
          <p className="text-xs text-muted-foreground line-clamp-1">
            {highlightMatch(truncate(item.description, 80), query)}
          </p>
        )}
      </div>
      <span className="text-xs text-muted-foreground shrink-0">
        {item.usageCount}x usado
      </span>
      {isActive && <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const SearchResults = forwardRef<SearchResultsHandle, SearchResultsProps>(
  function SearchResults({ results, query, activeIndex, onSelect, compact }, ref) {
    const router = useRouter()
    const containerRef = useRef<HTMLDivElement>(null)

    const flat = flattenResults(results)

    useImperativeHandle(ref, () => ({
      getTotalCount: () => flat.length,
      getItemAtIndex: (i: number) => flat[i] ?? null,
    }))

    // Scroll item ativo para a view
    useEffect(() => {
      if (!containerRef.current) return
      const el = containerRef.current.querySelector(`[data-index="${activeIndex}"]`)
      if (el) {
        el.scrollIntoView({ block: "nearest" })
      }
    }, [activeIndex])

    const handleClick = useCallback(
      (item: SearchResultItem) => {
        if (onSelect) {
          onSelect(item)
        } else {
          router.push(getItemRoute(item))
        }
      },
      [onSelect, router]
    )

    if (flat.length === 0) {
      return (
        <div className="py-8 text-center text-sm text-muted-foreground">
          Nenhum resultado encontrado para &ldquo;{query}&rdquo;
        </div>
      )
    }

    let globalIndex = 0

    const categories = (
      Object.keys(CATEGORY_CONFIG) as CategoryKey[]
    ).filter((key) => results[key] && results[key]!.items.length > 0)

    return (
      <div ref={containerRef} className="overflow-y-auto max-h-[400px]">
        {categories.map((key) => {
          const cfg = CATEGORY_CONFIG[key]
          const group = results[key]!
          const Icon = cfg.icon

          return (
            <div key={key}>
              {/* Header da categoria */}
              <div className="sticky top-0 bg-muted/80 backdrop-blur-sm px-3 py-1.5 flex items-center gap-2 border-b">
                <Icon className={cn("h-3.5 w-3.5", cfg.color)} />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {cfg.label}
                </span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {group.total}
                </span>
              </div>

              {/* Items */}
              {group.items.map((item) => {
                const idx = globalIndex++
                const isActive = idx === activeIndex

                return (
                  <div key={`${item.type}-${item.id}`} data-index={idx}>
                    {item.type === "task" && (
                      <TaskResultRow
                        item={item as TaskResult}
                        query={query}
                        isActive={isActive}
                        compact={compact}
                        onClick={() => handleClick(item)}
                      />
                    )}
                    {item.type === "agent" && (
                      <AgentResultRow
                        item={item as AgentResult}
                        query={query}
                        isActive={isActive}
                        onClick={() => handleClick(item)}
                      />
                    )}
                    {item.type === "tag" && (
                      <TagResultRow
                        item={item as TagResult}
                        query={query}
                        isActive={isActive}
                        onClick={() => handleClick(item)}
                      />
                    )}
                    {item.type === "template" && (
                      <TemplateResultRow
                        item={item as TemplateResult}
                        query={query}
                        isActive={isActive}
                        onClick={() => handleClick(item)}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    )
  }
)

export type { SearchResultItem, SearchResultsData }
