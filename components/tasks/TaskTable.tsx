"use client"

import { useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  Eye,
  Trash2,
  ArrowRight,
  Play,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { StatusBadge } from "./StatusBadge"
import { PriorityBadge } from "./PriorityBadge"
import { AgentBadge } from "@/components/agents/AgentBadge"
import { cn } from "@/lib/utils"
import type { TaskExecution } from "./TaskCard"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Task {
  id: string
  title: string
  description?: string | null
  status: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE" | "BLOCKED"
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"
  createdAt: string
  agent?: { id: string; name: string; role: "MAESTRO" | "SENTINEL" | "ARCHITECTON" | "PIXEL" } | null
  agentId?: string | null
}

interface TaskTableProps {
  tasks: Task[]
  executionMap?: Map<string, TaskExecution>
  onStatusChange: (taskId: string, status: string) => void
  onTaskClick: (taskId: string) => void
  onExecute?: (taskId: string, agentId: string) => void
  sortBy: string
  sortOrder: "asc" | "desc"
  onSort: (field: string) => void
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALID_TRANSITIONS: Record<string, { value: string; label: string }[]> = {
  TODO: [
    { value: "IN_PROGRESS", label: "Em Progresso" },
    { value: "BLOCKED", label: "Bloqueado" },
  ],
  IN_PROGRESS: [
    { value: "REVIEW", label: "Em Revisão" },
    { value: "TODO", label: "A Fazer" },
    { value: "BLOCKED", label: "Bloqueado" },
  ],
  REVIEW: [
    { value: "DONE", label: "Concluído" },
    { value: "IN_PROGRESS", label: "Em Progresso" },
    { value: "BLOCKED", label: "Bloqueado" },
  ],
  DONE: [],
  BLOCKED: [
    { value: "TODO", label: "A Fazer" },
    { value: "IN_PROGRESS", label: "Em Progresso" },
  ],
}

const EXEC_STATUS_LABEL: Record<string, { label: string; className: string }> = {
  RUNNING: { label: "Executando", className: "text-blue-600 bg-blue-50 border-blue-200" },
  QUEUED: { label: "Na fila", className: "text-muted-foreground bg-muted border-border" },
  PAUSED: { label: "Pausado", className: "text-yellow-600 bg-yellow-50 border-yellow-200" },
  COMPLETED: { label: "Concluído", className: "text-green-600 bg-green-50 border-green-200" },
  FAILED: { label: "Falhou", className: "text-red-600 bg-red-50 border-red-200" },
  CANCELLED: { label: "Cancelado", className: "text-muted-foreground bg-muted border-border" },
}

// ---------------------------------------------------------------------------
// Sort header
// ---------------------------------------------------------------------------

function SortHeader({
  label,
  field,
  sortBy,
  sortOrder,
  onSort,
  className,
}: {
  label: string
  field: string
  sortBy: string
  sortOrder: "asc" | "desc"
  onSort: (field: string) => void
  className?: string
}) {
  const active = sortBy === field
  return (
    <th className={cn("py-3 px-4 font-medium text-muted-foreground", className)}>
      <button
        onClick={() => onSort(field)}
        className="inline-flex items-center gap-1 hover:text-foreground transition-colors group"
      >
        {label}
        {active ? (
          sortOrder === "asc" ? (
            <ArrowUp className="h-3.5 w-3.5" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5" />
          )
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 opacity-0 group-hover:opacity-50 transition-opacity" />
        )}
      </button>
    </th>
  )
}

// ---------------------------------------------------------------------------
// Execution cell
// ---------------------------------------------------------------------------

function ExecutionCell({ execution }: { execution?: TaskExecution | null }) {
  if (!execution) {
    return <span className="text-muted-foreground">—</span>
  }

  const config = EXEC_STATUS_LABEL[execution.status]
  if (!config) return <span className="text-muted-foreground">—</span>

  const isRunning = execution.status === "RUNNING" || execution.status === "QUEUED"

  return (
    <div className="flex items-center gap-2">
      <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium border rounded-full px-2 py-0.5", config.className)}>
        {isRunning && <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />}
        {config.label}
      </span>
      {isRunning && (
        <span className="text-xs font-mono text-muted-foreground">{execution.progress}%</span>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TaskTable({
  tasks,
  executionMap,
  onStatusChange,
  onTaskClick,
  onExecute,
  sortBy,
  sortOrder,
  onSort,
}: TaskTableProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [executingId, setExecutingId] = useState<string | null>(null)

  const allSelected = tasks.length > 0 && selected.size === tasks.length

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(tasks.map((t) => t.id)))
    }
  }

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/tasks/${deleteTarget.id}`, { method: "DELETE" })
      if (res.ok) {
        setDeleteTarget(null)
        onStatusChange(deleteTarget.id, "__DELETED__")
      }
    } catch {
      // handled by parent
    } finally {
      setDeleting(false)
    }
  }

  const handleExecute = async (task: Task) => {
    if (!onExecute || !task.agentId) return
    setExecutingId(task.id)
    try {
      await onExecute(task.id, task.agentId)
    } finally {
      setExecutingId(null)
    }
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-lg">Nenhuma tarefa encontrada</p>
        <p className="text-sm">Ajuste os filtros ou crie uma nova tarefa</p>
      </div>
    )
  }

  return (
    <>
      {/* ---- Desktop table ---- */}
      <div className="hidden sm:block bg-card rounded-lg border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="rounded border-muted-foreground/40 h-4 w-4 cursor-pointer"
                  />
                </th>
                <SortHeader label="Título" field="title" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
                <SortHeader label="Status" field="status" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
                <SortHeader label="Prioridade" field="priority" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
                <th className="py-3 px-4 font-medium text-muted-foreground hidden xl:table-cell">Execução</th>
                <SortHeader label="Agente" field="agent" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} className="hidden lg:table-cell" />
                <SortHeader label="Criada" field="createdAt" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} className="hidden md:table-cell" />
                <th className="py-3 px-4 w-12" />
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => {
                const transitions = VALID_TRANSITIONS[task.status] || []
                const execution = executionMap?.get(task.id)
                const isRunning = execution?.status === "RUNNING" || execution?.status === "QUEUED" || execution?.status === "PAUSED"
                const canExecute = task.agentId && !isRunning && task.status !== "DONE" && onExecute

                return (
                  <tr
                    key={task.id}
                    className={cn(
                      "border-b last:border-0 hover:bg-muted/30 transition-colors",
                      selected.has(task.id) && "bg-primary/5"
                    )}
                  >
                    <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(task.id)}
                        onChange={() => toggleOne(task.id)}
                        className="rounded border-muted-foreground/40 h-4 w-4 cursor-pointer"
                      />
                    </td>
                    <td
                      className="py-3 px-4 cursor-pointer"
                      onClick={() => onTaskClick(task.id)}
                    >
                      <span className="font-medium hover:text-primary transition-colors line-clamp-1">
                        {task.title}
                      </span>
                      {task.description && (
                        <span className="block text-xs text-muted-foreground line-clamp-1 mt-0.5">
                          {task.description}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={task.status} />
                    </td>
                    <td className="py-3 px-4">
                      <PriorityBadge priority={task.priority} />
                    </td>
                    <td className="py-3 px-4 hidden xl:table-cell">
                      <ExecutionCell execution={execution} />
                    </td>
                    <td className="py-3 px-4 hidden lg:table-cell">
                      {task.agent ? (
                        <AgentBadge name={task.agent.name} role={task.agent.role} />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell">
                      <span className="text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true, locale: ptBR })}
                      </span>
                    </td>
                    <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-xs">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => onTaskClick(task.id)}>
                            <Eye className="h-4 w-4" />
                            Ver detalhes
                          </DropdownMenuItem>

                          {/* Execute action */}
                          {canExecute && (
                            <DropdownMenuItem
                              onClick={() => handleExecute(task)}
                              disabled={executingId === task.id}
                            >
                              {executingId === task.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                              Executar
                            </DropdownMenuItem>
                          )}

                          {transitions.length > 0 && (
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger>
                                <ArrowRight className="h-4 w-4" />
                                Mudar status
                              </DropdownMenuSubTrigger>
                              <DropdownMenuSubContent>
                                <DropdownMenuLabel>Mover para</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {transitions.map((t) => (
                                  <DropdownMenuItem
                                    key={t.value}
                                    onClick={() => onStatusChange(task.id, t.value)}
                                  >
                                    {t.label}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>
                          )}

                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeleteTarget(task)}
                          >
                            <Trash2 className="h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---- Mobile cards ---- */}
      <div className="sm:hidden space-y-3">
        {tasks.map((task) => {
          const transitions = VALID_TRANSITIONS[task.status] || []
          const execution = executionMap?.get(task.id)
          const isRunning = execution?.status === "RUNNING" || execution?.status === "QUEUED" || execution?.status === "PAUSED"
          const canExecute = task.agentId && !isRunning && task.status !== "DONE" && onExecute

          return (
            <div
              key={task.id}
              className="bg-card rounded-lg border shadow-sm p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => onTaskClick(task.id)}
                >
                  <p className="font-medium line-clamp-2">{task.title}</p>
                  {task.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                      {task.description}
                    </p>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-xs">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => onTaskClick(task.id)}>
                      <Eye className="h-4 w-4" />
                      Ver detalhes
                    </DropdownMenuItem>
                    {canExecute && (
                      <DropdownMenuItem onClick={() => handleExecute(task)}>
                        <Play className="h-4 w-4" />
                        Executar
                      </DropdownMenuItem>
                    )}
                    {transitions.length > 0 && (
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                          <ArrowRight className="h-4 w-4" />
                          Mudar status
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                          <DropdownMenuLabel>Mover para</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {transitions.map((t) => (
                            <DropdownMenuItem
                              key={t.value}
                              onClick={() => onStatusChange(task.id, t.value)}
                            >
                              {t.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setDeleteTarget(task)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={task.status} />
                <PriorityBadge priority={task.priority} />
                {task.agent && <AgentBadge name={task.agent.name} role={task.agent.role} />}
                {execution && <ExecutionCell execution={execution} />}
              </div>

              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true, locale: ptBR })}
              </p>
            </div>
          )
        })}
      </div>

      {/* ---- Delete confirmation ---- */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir tarefa</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir &quot;{deleteTarget?.title}&quot;? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
