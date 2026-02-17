"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Search, X, ChevronDown, SlidersHorizontal } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { STATUS_COLORS, PRIORITY_COLORS } from "@/lib/colors"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FilterState {
  status: string[]
  priority: string[]
  agentId: string | null
  search: string
  dateRange: { from: Date; to: Date } | null
  sortBy: "createdAt" | "priority" | "dueDate"
  sortOrder: "asc" | "desc"
}

interface Agent {
  id: string
  name: string
  role: string
}

interface TaskFiltersProps {
  onFilterChange: (filters: FilterState) => void
  agents: Agent[]
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = "tcc-task-filters"

const STATUS_OPTIONS = [
  { value: "TODO", label: "A Fazer", color: STATUS_COLORS.TODO.indicator },
  { value: "IN_PROGRESS", label: "Em Progresso", color: STATUS_COLORS.IN_PROGRESS.indicator },
  { value: "REVIEW", label: "Em Revisão", color: STATUS_COLORS.REVIEW.indicator },
  { value: "DONE", label: "Concluído", color: STATUS_COLORS.DONE.indicator },
  { value: "BLOCKED", label: "Bloqueado", color: STATUS_COLORS.BLOCKED.indicator },
]

const PRIORITY_OPTIONS = [
  { value: "URGENT", label: "Urgente", color: PRIORITY_COLORS.URGENT.indicator },
  { value: "HIGH", label: "Alta", color: PRIORITY_COLORS.HIGH.indicator },
  { value: "MEDIUM", label: "Média", color: PRIORITY_COLORS.MEDIUM.indicator },
  { value: "LOW", label: "Baixa", color: PRIORITY_COLORS.LOW.indicator },
]

const SORT_OPTIONS = [
  { value: "createdAt", label: "Data de Criação" },
  { value: "priority", label: "Prioridade" },
  { value: "dueDate", label: "Prazo" },
]

const DEFAULT_FILTERS: FilterState = {
  status: [],
  priority: [],
  agentId: null,
  search: "",
  dateRange: null,
  sortBy: "createdAt",
  sortOrder: "desc",
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadFilters(): FilterState {
  if (typeof window === "undefined") return DEFAULT_FILTERS
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return DEFAULT_FILTERS
    const parsed = JSON.parse(stored)
    return { ...DEFAULT_FILTERS, ...parsed, dateRange: null }
  } catch {
    return DEFAULT_FILTERS
  }
}

function saveFilters(filters: FilterState) {
  try {
    const { dateRange, ...rest } = filters
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rest))
  } catch {
    // localStorage may be unavailable
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TaskFilters({ onFilterChange, agents }: TaskFiltersProps) {
  const [filters, setFilters] = useState<FilterState>(loadFilters)
  const [searchInput, setSearchInput] = useState(filters.search)
  const [mobileOpen, setMobileOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initialMount = useRef(true)

  // Emit on change (skip initial mount)
  useEffect(() => {
    if (initialMount.current) {
      initialMount.current = false
      onFilterChange(filters)
      return
    }
    saveFilters(filters)
    onFilterChange(filters)
  }, [filters]) // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: searchInput }))
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchInput])

  const toggleArrayValue = useCallback((key: "status" | "priority", value: string) => {
    setFilters((prev) => {
      const arr = prev[key]
      const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]
      return { ...prev, [key]: next }
    })
  }, [])

  const activeCount =
    filters.status.length +
    filters.priority.length +
    (filters.agentId ? 1 : 0) +
    (filters.search ? 1 : 0)

  const isDefault =
    filters.status.length === 0 &&
    filters.priority.length === 0 &&
    !filters.agentId &&
    !filters.search &&
    filters.sortBy === "createdAt" &&
    filters.sortOrder === "desc"

  const clearAll = () => {
    setFilters(DEFAULT_FILTERS)
    setSearchInput("")
  }

  // -----------------------------------------------------------------------
  // Filter controls (shared between desktop and mobile)
  // -----------------------------------------------------------------------

  const filterControls = (
    <>
      {/* Search */}
      <div className="relative w-full sm:w-56">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Buscar tarefas..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-9 h-9"
        />
        {searchInput && (
          <button
            onClick={() => setSearchInput("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Status multi-select */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5 h-9">
            Status
            {filters.status.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs rounded-full">
                {filters.status.length}
              </Badge>
            )}
            <ChevronDown className="h-3.5 w-3.5 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuLabel>Filtrar por Status</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {STATUS_OPTIONS.map((opt) => (
            <DropdownMenuCheckboxItem
              key={opt.value}
              checked={filters.status.includes(opt.value)}
              onCheckedChange={() => toggleArrayValue("status", opt.value)}
              onSelect={(e) => e.preventDefault()}
            >
              <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", opt.color)} />
              {opt.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Priority multi-select */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5 h-9">
            Prioridade
            {filters.priority.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs rounded-full">
                {filters.priority.length}
              </Badge>
            )}
            <ChevronDown className="h-3.5 w-3.5 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuLabel>Filtrar por Prioridade</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {PRIORITY_OPTIONS.map((opt) => (
            <DropdownMenuCheckboxItem
              key={opt.value}
              checked={filters.priority.includes(opt.value)}
              onCheckedChange={() => toggleArrayValue("priority", opt.value)}
              onSelect={(e) => e.preventDefault()}
            >
              <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", opt.color)} />
              {opt.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Agent select */}
      <Select
        value={filters.agentId ?? "ALL"}
        onValueChange={(v) => setFilters((prev) => ({ ...prev, agentId: v === "ALL" ? null : v }))}
      >
        <SelectTrigger className="w-full sm:w-40 h-9">
          <SelectValue placeholder="Agente" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Todos Agentes</SelectItem>
          <SelectItem value="NO_AGENT">Sem Agente</SelectItem>
          {agents.map((agent) => (
            <SelectItem key={agent.id} value={agent.id}>
              {agent.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Sort */}
      <Select
        value={`${filters.sortBy}:${filters.sortOrder}`}
        onValueChange={(v) => {
          const [sortBy, sortOrder] = v.split(":") as [FilterState["sortBy"], FilterState["sortOrder"]]
          setFilters((prev) => ({ ...prev, sortBy, sortOrder }))
        }}
      >
        <SelectTrigger className="w-full sm:w-44 h-9">
          <SelectValue placeholder="Ordenar" />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((opt) => (
            <SelectItem key={`${opt.value}:desc`} value={`${opt.value}:desc`}>
              {opt.label} (Recentes)
            </SelectItem>
          ))}
          {SORT_OPTIONS.map((opt) => (
            <SelectItem key={`${opt.value}:asc`} value={`${opt.value}:asc`}>
              {opt.label} (Antigos)
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Clear */}
      {!isDefault && (
        <Button variant="ghost" size="sm" onClick={clearAll} className="gap-1.5 h-9 text-muted-foreground">
          <X className="h-3.5 w-3.5" />
          Limpar
        </Button>
      )}
    </>
  )

  return (
    <div className="space-y-2">
      {/* Desktop */}
      <div className="hidden sm:flex flex-wrap items-center gap-2">
        {filterControls}
      </div>

      {/* Mobile toggle */}
      <div className="sm:hidden">
        <Button
          variant="outline"
          className="w-full justify-between h-9"
          onClick={() => setMobileOpen((o) => !o)}
        >
          <span className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4" />
            Filtros
            {activeCount > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs rounded-full">
                {activeCount}
              </Badge>
            )}
          </span>
          <ChevronDown className={cn("h-4 w-4 transition-transform", mobileOpen && "rotate-180")} />
        </Button>

        {mobileOpen && (
          <div className="flex flex-col gap-2 mt-2 p-3 border rounded-lg bg-card">
            {filterControls}
          </div>
        )}
      </div>
    </div>
  )
}
