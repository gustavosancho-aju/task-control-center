import * as XLSX from "xlsx"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExportTask {
  id: string
  title: string
  description?: string | null
  status: string
  priority: string
  createdAt: string
  dueDate?: string | null
  completedAt?: string | null
  estimatedHours?: number | null
  actualHours?: number | null
  agent?: { name: string; role: string } | null
  tags?: { name: string }[]
}

interface ExportAgent {
  name: string
  role: string
  tasksCount: number
  completedCount: number
  successRate: number
}

interface ExportMetrics {
  total: number
  completed: number
  inProgress: number
  blocked: number
  todo: number
  review: number
  completionRate: number
  avgCompletionHours: number | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<string, string> = {
  TODO: "A Fazer",
  IN_PROGRESS: "Em Progresso",
  REVIEW: "Em Revisao",
  DONE: "Concluida",
  BLOCKED: "Bloqueada",
}

const PRIORITY_LABELS: Record<string, string> = {
  LOW: "Baixa",
  MEDIUM: "Media",
  HIGH: "Alta",
  URGENT: "Urgente",
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ""
  return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR })
}

function setColumnWidths(ws: XLSX.WorkSheet, widths: number[]) {
  ws["!cols"] = widths.map((w) => ({ wch: w }))
}

// ---------------------------------------------------------------------------
// Generate Tasks Excel (simple - single sheet)
// ---------------------------------------------------------------------------

export function generateTasksExcel(tasks: ExportTask[]): Uint8Array {
  const wb = XLSX.utils.book_new()

  // --- Tasks Sheet ---
  const taskHeaders = [
    "ID",
    "Titulo",
    "Descricao",
    "Status",
    "Prioridade",
    "Agente",
    "Funcao Agente",
    "Data Criacao",
    "Prazo",
    "Conclusao",
    "Horas Estimadas",
    "Horas Reais",
    "Tags",
  ]

  const taskRows = tasks.map((t) => [
    t.id,
    t.title,
    t.description || "",
    STATUS_LABELS[t.status] || t.status,
    PRIORITY_LABELS[t.priority] || t.priority,
    t.agent?.name || "",
    t.agent?.role || "",
    formatDate(t.createdAt),
    formatDate(t.dueDate),
    formatDate(t.completedAt),
    t.estimatedHours ?? "",
    t.actualHours ?? "",
    t.tags?.map((tag) => tag.name).join(", ") || "",
  ])

  const wsData = [taskHeaders, ...taskRows]
  const ws = XLSX.utils.aoa_to_sheet(wsData)
  setColumnWidths(ws, [24, 40, 50, 14, 12, 16, 16, 14, 14, 14, 14, 12, 30])

  XLSX.utils.book_append_sheet(wb, ws, "Tarefas")

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })
  return new Uint8Array(buf)
}

// ---------------------------------------------------------------------------
// Generate Full Report Excel (multiple sheets)
// ---------------------------------------------------------------------------

export function generateFullExcel(
  tasks: ExportTask[],
  agents: ExportAgent[],
  metrics: ExportMetrics
): Uint8Array {
  const wb = XLSX.utils.book_new()

  // --- Sheet 1: Tarefas ---
  const taskHeaders = [
    "ID",
    "Titulo",
    "Descricao",
    "Status",
    "Prioridade",
    "Agente",
    "Funcao Agente",
    "Data Criacao",
    "Prazo",
    "Conclusao",
    "Horas Estimadas",
    "Horas Reais",
    "Tags",
  ]

  const taskRows = tasks.map((t) => [
    t.id,
    t.title,
    t.description || "",
    STATUS_LABELS[t.status] || t.status,
    PRIORITY_LABELS[t.priority] || t.priority,
    t.agent?.name || "",
    t.agent?.role || "",
    formatDate(t.createdAt),
    formatDate(t.dueDate),
    formatDate(t.completedAt),
    t.estimatedHours ?? "",
    t.actualHours ?? "",
    t.tags?.map((tag) => tag.name).join(", ") || "",
  ])

  const wsTasks = XLSX.utils.aoa_to_sheet([taskHeaders, ...taskRows])
  setColumnWidths(wsTasks, [24, 40, 50, 14, 12, 16, 16, 14, 14, 14, 14, 12, 30])
  XLSX.utils.book_append_sheet(wb, wsTasks, "Tarefas")

  // --- Sheet 2: Agentes ---
  const agentHeaders = ["Nome", "Funcao", "Total Tarefas", "Concluidas", "Taxa de Sucesso (%)"]
  const agentRows = agents.map((a) => [
    a.name,
    a.role,
    a.tasksCount,
    a.completedCount,
    a.successRate,
  ])

  const wsAgents = XLSX.utils.aoa_to_sheet([agentHeaders, ...agentRows])
  setColumnWidths(wsAgents, [20, 16, 14, 14, 18])
  XLSX.utils.book_append_sheet(wb, wsAgents, "Agentes")

  // --- Sheet 3: Metricas ---
  const metricsData = [
    ["Metrica", "Valor"],
    ["Total de Tarefas", metrics.total],
    ["Concluidas", metrics.completed],
    ["Em Progresso", metrics.inProgress],
    ["A Fazer", metrics.todo],
    ["Em Revisao", metrics.review],
    ["Bloqueadas", metrics.blocked],
    ["Taxa de Conclusao (%)", metrics.completionRate],
    ["Tempo Medio de Conclusao (h)", metrics.avgCompletionHours ?? "N/A"],
    [""],
    ["Gerado em", format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })],
  ]

  const wsMetrics = XLSX.utils.aoa_to_sheet(metricsData)
  setColumnWidths(wsMetrics, [30, 20])
  XLSX.utils.book_append_sheet(wb, wsMetrics, "Metricas")

  // --- Sheet 4: Resumo por Status ---
  const statusSummary = [
    ["Status", "Quantidade", "Percentual (%)"],
    ["A Fazer", metrics.todo, metrics.total > 0 ? ((metrics.todo / metrics.total) * 100).toFixed(1) : 0],
    ["Em Progresso", metrics.inProgress, metrics.total > 0 ? ((metrics.inProgress / metrics.total) * 100).toFixed(1) : 0],
    ["Em Revisao", metrics.review, metrics.total > 0 ? ((metrics.review / metrics.total) * 100).toFixed(1) : 0],
    ["Concluidas", metrics.completed, metrics.total > 0 ? ((metrics.completed / metrics.total) * 100).toFixed(1) : 0],
    ["Bloqueadas", metrics.blocked, metrics.total > 0 ? ((metrics.blocked / metrics.total) * 100).toFixed(1) : 0],
  ]

  const wsStatus = XLSX.utils.aoa_to_sheet(statusSummary)
  setColumnWidths(wsStatus, [16, 14, 16])
  XLSX.utils.book_append_sheet(wb, wsStatus, "Resumo Status")

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })
  return new Uint8Array(buf)
}
