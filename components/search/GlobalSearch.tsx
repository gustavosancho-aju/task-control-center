"use client"

import {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react"
import { useRouter } from "next/navigation"
import {
  Search,
  X,
  Loader2,
  Plus,
  Activity,
  ArrowUp,
  ArrowDown,
  CornerDownLeft,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  SearchResults,
  type SearchResultItem,
  type SearchResultsData,
  type SearchResultsHandle,
} from "./SearchResults"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GlobalSearchProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface QuickAction {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  href: string
  keywords: string[]
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "new-task",
    label: "Criar nova tarefa",
    icon: Plus,
    href: "/create",
    keywords: ["criar", "nova", "tarefa", "new", "task", "adicionar"],
  },
  {
    id: "monitor",
    label: "Ir para Monitor",
    icon: Activity,
    href: "/monitor",
    keywords: ["monitor", "acompanhar", "execução", "status"],
  },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResultsData>({})
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resultsRef = useRef<SearchResultsHandle>(null)
  const backdropRef = useRef<HTMLDivElement>(null)

  // Focar input quando abrir
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
    } else {
      setQuery("")
      setResults({})
      setActiveIndex(0)
    }
  }, [open])

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!query.trim() || query.trim().length < 2) {
      setResults({})
      setLoading(false)
      return
    }

    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(query.trim())}&limit=6`
        )
        const data = await res.json()
        if (data.success) {
          setResults(data.results)
          setActiveIndex(0)
        }
      } catch {
        // fail silently
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  // Filtrar quick actions pelo query
  const filteredActions = query.trim()
    ? QUICK_ACTIONS.filter((a) =>
        a.keywords.some((kw) => kw.includes(query.toLowerCase())) ||
        a.label.toLowerCase().includes(query.toLowerCase())
      )
    : QUICK_ACTIONS

  // Total de itens navegáveis
  const getTotalNavigable = useCallback(() => {
    const resultCount = resultsRef.current?.getTotalCount() ?? 0
    return resultCount + filteredActions.length
  }, [filteredActions.length])

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const total = getTotalNavigable()

      switch (e.key) {
        case "Escape":
          e.preventDefault()
          onOpenChange(false)
          break
        case "ArrowDown":
          e.preventDefault()
          setActiveIndex((prev) => (prev + 1) % Math.max(total, 1))
          break
        case "ArrowUp":
          e.preventDefault()
          setActiveIndex((prev) => (prev - 1 + Math.max(total, 1)) % Math.max(total, 1))
          break
        case "Enter":
          e.preventDefault()
          handleEnter()
          break
      }
    },
    [getTotalNavigable, onOpenChange]
  )

  const handleEnter = useCallback(() => {
    const resultCount = resultsRef.current?.getTotalCount() ?? 0

    if (activeIndex < resultCount) {
      const item = resultsRef.current?.getItemAtIndex(activeIndex)
      if (item) handleSelectResult(item)
    } else {
      const actionIdx = activeIndex - resultCount
      const action = filteredActions[actionIdx]
      if (action) {
        onOpenChange(false)
        router.push(action.href)
      }
    }
  }, [activeIndex, filteredActions, router, onOpenChange])

  const handleSelectResult = useCallback(
    (item: SearchResultItem) => {
      onOpenChange(false)
      switch (item.type) {
        case "task":
          router.push(`/tasks/${item.id}`)
          break
        case "agent":
          router.push(`/agents`)
          break
        case "tag":
          router.push(`/search?q=${encodeURIComponent((item as any).name)}&type=task`)
          break
        case "template":
          router.push(`/templates`)
          break
      }
    },
    [router, onOpenChange]
  )

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === backdropRef.current) {
        onOpenChange(false)
      }
    },
    [onOpenChange]
  )

  const handleOpenAdvanced = useCallback(() => {
    onOpenChange(false)
    router.push(`/search${query ? `?q=${encodeURIComponent(query)}` : ""}`)
  }, [query, router, onOpenChange])

  const hasResults = Object.values(results).some((r) => r && r.items.length > 0)
  const hasQuery = query.trim().length >= 2

  if (!open) return null

  const resultCount = resultsRef.current?.getTotalCount() ?? 0

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-start justify-center pt-[15vh] animate-in fade-in duration-150"
    >
      <div className="w-full max-w-xl bg-popover rounded-xl shadow-2xl border overflow-hidden animate-in zoom-in-95 slide-in-from-top-2 duration-200 mx-4">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 border-b">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar tarefas, agentes, tags, templates..."
            className="flex-1 h-12 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {query && !loading && (
            <button
              onClick={() => {
                setQuery("")
                inputRef.current?.focus()
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Results area */}
        <div className="max-h-[60vh] overflow-y-auto">
          {/* Search results */}
          {hasQuery && hasResults && (
            <SearchResults
              ref={resultsRef}
              results={results}
              query={query}
              activeIndex={activeIndex}
              onSelect={handleSelectResult}
              compact
            />
          )}

          {/* No results */}
          {hasQuery && !loading && !hasResults && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Nenhum resultado para &ldquo;{query}&rdquo;
            </div>
          )}

          {/* Quick actions */}
          {filteredActions.length > 0 && (
            <div>
              <div className="px-3 py-1.5 border-b border-t bg-muted/50">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Ações rápidas
                </span>
              </div>
              {filteredActions.map((action, i) => {
                const idx = resultCount + i
                const isActive = idx === activeIndex
                const Icon = action.icon

                return (
                  <button
                    key={action.id}
                    onClick={() => {
                      onOpenChange(false)
                      router.push(action.href)
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2.5 flex items-center gap-3 transition-colors",
                      isActive ? "bg-primary/10" : "hover:bg-muted/50"
                    )}
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{action.label}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/30 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <ArrowUp className="h-3 w-3" />
              <ArrowDown className="h-3 w-3" />
              navegar
            </span>
            <span className="inline-flex items-center gap-1">
              <CornerDownLeft className="h-3 w-3" />
              selecionar
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-muted border text-[10px] font-mono">esc</kbd>
              fechar
            </span>
          </div>
          {hasQuery && (
            <button
              onClick={handleOpenAdvanced}
              className="text-primary hover:underline"
            >
              Busca avançada
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
