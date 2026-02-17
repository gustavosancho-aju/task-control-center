"use client"

import { useEffect, useState, useCallback } from "react"
import { Header } from "@/components/layout/Header"
import { AuditTimeline } from "@/components/audit/AuditTimeline"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Shield,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react"
import { notifyError } from "@/lib/notifications"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuditEntry {
  id: string
  entityType: string
  entityId: string
  action: string
  changes?: Record<string, { from: unknown; to: unknown }> | null
  performedBy: string
  ipAddress?: string | null
  createdAt: string
}

interface Pagination {
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ENTITY_TYPES = [
  { value: "ALL", label: "Todos os Tipos" },
  { value: "Task", label: "Tarefas" },
  { value: "Execution", label: "Execucoes" },
  { value: "Comment", label: "Comentarios" },
  { value: "Attachment", label: "Anexos" },
  { value: "Settings", label: "Configuracoes" },
]

const ACTIONS = [
  { value: "ALL", label: "Todas as Acoes" },
  { value: "CREATE", label: "Criacao" },
  { value: "UPDATE", label: "Atualizacao" },
  { value: "DELETE", label: "Remocao" },
  { value: "EXECUTE", label: "Execucao" },
  { value: "ASSIGN", label: "Atribuicao" },
  { value: "COMPLETE", label: "Conclusao" },
  { value: "COMMENT", label: "Comentario" },
  { value: "UPLOAD", label: "Upload" },
]

const PAGE_SIZE = 30

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)

  // Filters
  const [entityType, setEntityType] = useState("ALL")
  const [action, setAction] = useState("ALL")
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [page, setPage] = useState(0)

  const fetchLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      params.set("limit", String(PAGE_SIZE))
      params.set("offset", String(page * PAGE_SIZE))

      if (entityType !== "ALL") params.set("entityType", entityType)
      if (action !== "ALL") params.set("action", action)
      if (search) params.set("search", search)

      const res = await fetch(`/api/audit?${params.toString()}`)
      const data = await res.json()

      if (data.success) {
        setEntries(data.data)
        setPagination(data.pagination)
      }
    } catch {
      notifyError("Erro ao carregar logs de auditoria")
    } finally {
      setLoading(false)
    }
  }, [entityType, action, search, page])

  useEffect(() => {
    setLoading(true)
    fetchLogs()
  }, [fetchLogs])

  const handleSearch = () => {
    setSearch(searchInput)
    setPage(0)
  }

  const handleClearFilters = () => {
    setEntityType("ALL")
    setAction("ALL")
    setSearch("")
    setSearchInput("")
    setPage(0)
  }

  const hasActiveFilters = entityType !== "ALL" || action !== "ALL" || search !== ""
  const totalPages = pagination ? Math.ceil(pagination.total / PAGE_SIZE) : 0

  return (
    <div className="min-h-screen bg-muted/40">
      <Header />
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              Auditoria
            </h1>
            <p className="text-sm text-muted-foreground">
              Registro completo de todas as acoes no sistema
            </p>
          </div>

          <div className="flex items-center gap-2">
            {pagination && (
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {pagination.total} registro{pagination.total !== 1 ? "s" : ""}
              </span>
            )}
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                setLoading(true)
                fetchLogs()
              }}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-card rounded-xl border shadow-sm p-4">
          <div className="flex flex-wrap items-end gap-3">
            {/* Entity type */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Tipo</label>
              <Select
                value={entityType}
                onValueChange={(v) => {
                  setEntityType(v)
                  setPage(0)
                }}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Action */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Acao</label>
              <Select
                value={action}
                onValueChange={(v) => {
                  setAction(v)
                  setPage(0)
                }}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTIONS.map((a) => (
                    <SelectItem key={a.value} value={a.value}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div className="space-y-1 flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-muted-foreground">Busca</label>
              <div className="flex gap-2">
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Buscar por tipo, ID ou usuario..."
                  className="flex-1"
                />
                <Button variant="outline" size="icon" onClick={handleSearch}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Clear */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="gap-1.5 text-muted-foreground"
              >
                <X className="h-3.5 w-3.5" />
                Limpar
              </Button>
            )}
          </div>

          {/* Active filter badges */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t">
              {entityType !== "ALL" && (
                <Badge variant="secondary" className="text-xs gap-1">
                  Tipo: {ENTITY_TYPES.find((t) => t.value === entityType)?.label}
                  <button onClick={() => { setEntityType("ALL"); setPage(0) }}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {action !== "ALL" && (
                <Badge variant="secondary" className="text-xs gap-1">
                  Acao: {ACTIONS.find((a) => a.value === action)?.label}
                  <button onClick={() => { setAction("ALL"); setPage(0) }}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {search && (
                <Badge variant="secondary" className="text-xs gap-1">
                  Busca: &quot;{search}&quot;
                  <button onClick={() => { setSearch(""); setSearchInput(""); setPage(0) }}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="bg-card rounded-xl border shadow-sm p-6 space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-card rounded-xl border shadow-sm p-6">
            <AuditTimeline entries={entries} showEntity={true} />
          </div>
        )}

        {/* Pagination */}
        {!loading && pagination && totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Mostrando {page * PAGE_SIZE + 1}-
              {Math.min((page + 1) * PAGE_SIZE, pagination.total)} de{" "}
              {pagination.total}
            </p>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>

              <span className="text-sm text-muted-foreground px-2">
                {page + 1} / {totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                disabled={!pagination.hasMore}
                onClick={() => setPage((p) => p + 1)}
                className="gap-1"
              >
                Proximo
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
