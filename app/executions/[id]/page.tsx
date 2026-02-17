"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Header } from "@/components/layout/Header"
import { ExecutionProgress } from "@/components/executions/ExecutionProgress"
import { ExecutionLogs } from "@/components/executions/ExecutionLogs"
import { AgentBadge } from "@/components/agents/AgentBadge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  ExternalLink,
  FileText,
  XCircle,
  RefreshCw,
  Download,
  CheckCircle2,
  Search,
  Clock,
} from "lucide-react"
import { EXECUTION_COLORS, SEMANTIC_COLORS } from "@/lib/colors"

// ============================================================================
// Types
// ============================================================================

type ExecutionStatus = "QUEUED" | "RUNNING" | "PAUSED" | "COMPLETED" | "FAILED" | "CANCELLED"
type AgentRole = "MAESTRO" | "SENTINEL" | "ARCHITECTON" | "PIXEL"
type LogLevel = "INFO" | "WARNING" | "ERROR" | "DEBUG"

interface Execution {
  id: string
  taskId: string
  agentId: string
  status: ExecutionStatus
  startedAt: string | null
  completedAt: string | null
  progress: number
  result: string | null
  error: string | null
  metadata: { artifacts?: string[] } | null
  createdAt: string
  updatedAt: string
  task: {
    id: string
    title: string
    status: string
    priority: string
    description: string | null
  }
  agent: {
    id: string
    name: string
    role: AgentRole
    description: string | null
  }
  logs: LogEntry[]
}

interface LogEntry {
  id: string
  level: LogLevel
  message: string
  data: Record<string, unknown> | null
  createdAt: string
}

const STATUS_STYLES: Record<ExecutionStatus, { label: string; class: string }> = {
  QUEUED: { label: "Aguardando", class: EXECUTION_COLORS.QUEUED.badge },
  RUNNING: { label: "Executando", class: EXECUTION_COLORS.RUNNING.badge },
  PAUSED: { label: "Pausado", class: EXECUTION_COLORS.PAUSED.badge },
  COMPLETED: { label: "Concluído", class: EXECUTION_COLORS.COMPLETED.badge },
  FAILED: { label: "Falhou", class: EXECUTION_COLORS.FAILED.badge },
  CANCELLED: { label: "Cancelado", class: EXECUTION_COLORS.CANCELLED.badge },
}

// ============================================================================
// Helpers
// ============================================================================

function formatDuration(ms: number): string {
  const sec = Math.floor(ms / 1000)
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}s`
  if (m > 0) return `${m}m ${s.toString().padStart(2, "0")}s`
  return `${s}s`
}

function shortId(id: string): string {
  return id.slice(-8)
}

// ============================================================================
// Component
// ============================================================================

export default function ExecutionDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const executionId = params.id

  const [execution, setExecution] = useState<Execution | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [logFilter, setLogFilter] = useState<LogLevel | "ALL">("ALL")
  const [logSearch, setLogSearch] = useState("")

  const isActive = execution?.status === "RUNNING" || execution?.status === "QUEUED"

  // --------------------------------------------------------------------------
  // Fetch
  // --------------------------------------------------------------------------

  const fetchExecution = useCallback(async () => {
    try {
      const res = await fetch(`/api/executions/${executionId}`)
      if (res.status === 404) {
        setError("Execução não encontrada")
        return
      }
      if (!res.ok) throw new Error("Erro ao buscar execução")
      const data = await res.json()
      if (data.success) setExecution(data.data)
      else throw new Error(data.error)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
    } finally {
      setLoading(false)
    }
  }, [executionId])

  useEffect(() => {
    fetchExecution()
  }, [fetchExecution])

  // Polling while active
  useEffect(() => {
    if (!isActive) return
    const interval = setInterval(fetchExecution, 3000)
    return () => clearInterval(interval)
  }, [isActive, fetchExecution])

  // --------------------------------------------------------------------------
  // Actions
  // --------------------------------------------------------------------------

  const handleAction = async (action: "pause" | "resume" | "cancel") => {
    setActionLoading(action)
    try {
      await fetch(`/api/executions/${executionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      await fetchExecution()
    } catch { /* silent */ }
    setActionLoading(null)
  }

  const handleRetry = async () => {
    if (!execution) return
    setActionLoading("retry")
    try {
      const res = await fetch("/api/executions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: execution.taskId, agentId: execution.agentId }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.success && data.data.execution) {
          router.push(`/executions/${data.data.execution.id}`)
          return
        }
      }
      await fetchExecution()
    } catch { /* silent */ }
    setActionLoading(null)
  }

  const handleExportLogs = () => {
    if (!execution) return
    const logs = execution.logs
      .map((l) => `[${l.createdAt}] [${l.level}] ${l.message}${l.data ? " " + JSON.stringify(l.data) : ""}`)
      .join("\n")
    const blob = new Blob([logs], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `execution-${shortId(executionId)}-logs.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  // --------------------------------------------------------------------------
  // Loading
  // --------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/40">
        <Header />
        <main className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">Carregando execução...</p>
          </div>
        </main>
      </div>
    )
  }

  // --------------------------------------------------------------------------
  // Error / 404
  // --------------------------------------------------------------------------

  if (error || !execution) {
    return (
      <div className="min-h-screen bg-muted/40">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Card className="border-destructive">
              <CardContent className="py-12 text-center space-y-4">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
                <h2 className="text-2xl font-bold text-destructive">
                  {error === "Execução não encontrada" ? "Execução não encontrada" : "Erro"}
                </h2>
                <p className="text-muted-foreground">{error || "Não foi possível carregar a execução."}</p>
                <Button onClick={() => router.push("/monitor")} className="mt-4">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar para Monitor
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    )
  }

  // --------------------------------------------------------------------------
  // Derived values
  // --------------------------------------------------------------------------

  const statusStyle = STATUS_STYLES[execution.status]
  const startMs = execution.startedAt ? new Date(execution.startedAt).getTime() : null
  const endMs = execution.completedAt ? new Date(execution.completedAt).getTime() : null
  const duration = startMs ? (endMs ?? Date.now()) - startMs : null
  const artifacts = execution.metadata?.artifacts ?? []

  const filteredLogCount = execution.logs.filter((l) => {
    if (logFilter !== "ALL" && l.level !== logFilter) return false
    if (logSearch && !l.message.toLowerCase().includes(logSearch.toLowerCase())) return false
    return true
  }).length

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-muted/40">
      <Header />

      <main className="container mx-auto px-4 py-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* ================================================================ */}
          {/* Header */}
          {/* ================================================================ */}
          <div className="space-y-3">
            <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">Execução #{shortId(execution.id)}</h1>
                <Badge variant="outline" className={statusStyle.class}>
                  {statusStyle.label}
                </Badge>
              </div>
              {isActive && (
                <span className={`flex items-center gap-1.5 text-xs ${SEMANTIC_COLORS.success}`}>
                  <span className={`h-2 w-2 rounded-full animate-pulse ${EXECUTION_COLORS.COMPLETED.badge.split(' ')[0]}`} />
                  Atualizando em tempo real
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ============================================================ */}
            {/* Left column */}
            {/* ============================================================ */}
            <div className="lg:col-span-2 space-y-6">
              {/* Card Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Informações</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Tarefa</p>
                      <Link
                        href={`/tasks/${execution.task.id}`}
                        className={`text-sm font-medium flex items-center gap-1 transition-colors ${SEMANTIC_COLORS.info}`}
                      >
                        {execution.task.title}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Agente</p>
                      <AgentBadge name={execution.agent.name} role={execution.agent.role} />
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Iniciado em</p>
                      <p className="text-sm">
                        {execution.startedAt
                          ? format(new Date(execution.startedAt), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })
                          : "—"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Concluído em</p>
                      <p className="text-sm">
                        {execution.completedAt
                          ? format(new Date(execution.completedAt), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })
                          : "—"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Duração</p>
                      <p className="text-sm font-mono flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        {duration ? formatDuration(duration) : "—"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground mb-1">ID</p>
                      <p className="text-xs font-mono text-muted-foreground select-all">{execution.id}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Card Progresso */}
              <ExecutionProgress
                execution={execution}
                onPause={execution.status === "RUNNING" ? () => handleAction("pause") : undefined}
                onResume={execution.status === "PAUSED" ? () => handleAction("resume") : undefined}
                onCancel={
                  ["RUNNING", "PAUSED", "QUEUED"].includes(execution.status)
                    ? () => handleAction("cancel")
                    : undefined
                }
              />

              {/* Card Resultado (se completado) */}
              {execution.status === "COMPLETED" && execution.result && (
                <Card className={`border ${EXECUTION_COLORS.COMPLETED.result}`}>
                  <CardHeader className="pb-3">
                    <CardTitle className={`flex items-center gap-2 ${SEMANTIC_COLORS.success}`}>
                      <CheckCircle2 className="h-5 w-5" />
                      Resultado
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className={`rounded-lg p-4 max-h-[400px] overflow-y-auto ${EXECUTION_COLORS.COMPLETED.result}`}>
                      <pre className="text-sm whitespace-pre-wrap font-mono text-foreground leading-relaxed">
                        {execution.result}
                      </pre>
                    </div>

                    {artifacts.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                          Artefatos gerados
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {artifacts.map((artifact, i) => (
                            <Badge key={i} variant="outline" className="gap-1.5 text-xs">
                              <FileText className="h-3 w-3" />
                              {artifact}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Card Erro (se falhou) */}
              {execution.status === "FAILED" && (
                <Card className={`border ${EXECUTION_COLORS.FAILED.error}`}>
                  <CardHeader className="pb-3">
                    <CardTitle className={`flex items-center gap-2 ${SEMANTIC_COLORS.error}`}>
                      <XCircle className="h-5 w-5" />
                      Erro
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {execution.error && (
                      <div className={`rounded-lg p-4 ${EXECUTION_COLORS.FAILED.error}`}>
                        <pre className={`text-sm whitespace-pre-wrap font-mono break-all ${EXECUTION_COLORS.FAILED.errorText}`}>
                          {execution.error}
                        </pre>
                      </div>
                    )}

                    <Button
                      onClick={handleRetry}
                      disabled={actionLoading === "retry"}
                      className="gap-2"
                    >
                      {actionLoading === "retry" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      Tentar Novamente
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* ============================================================ */}
            {/* Right column - Logs */}
            {/* ============================================================ */}
            <div className="lg:col-span-1 space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Logs</CardTitle>
                    <Button variant="ghost" size="sm" onClick={handleExportLogs} className="gap-1.5 h-7 text-xs">
                      <Download className="h-3 w-3" />
                      Exportar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Filters */}
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Buscar nos logs..."
                        value={logSearch}
                        onChange={(e) => setLogSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {(["ALL", "INFO", "WARNING", "ERROR", "DEBUG"] as const).map((level) => (
                        <button
                          key={level}
                          onClick={() => setLogFilter(level)}
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full border transition-colors ${
                            logFilter === level
                              ? "bg-foreground text-background border-foreground"
                              : "bg-card text-muted-foreground border-border hover:border-foreground/30"
                          }`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>

                    {(logFilter !== "ALL" || logSearch) && (
                      <p className="text-[10px] text-muted-foreground">
                        {filteredLogCount} de {execution.logs.length} logs
                      </p>
                    )}
                  </div>

                  {/* Logs viewer */}
                  <div className="[&>div]:max-h-[600px]">
                    <ExecutionLogs executionId={execution.id} />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
