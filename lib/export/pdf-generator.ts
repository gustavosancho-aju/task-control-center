import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
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

interface ReportData {
  tasks: ExportTask[]
  metrics: {
    total: number
    completed: number
    inProgress: number
    blocked: number
    todo: number
    review: number
    completionRate: number
    avgCompletionHours: number | null
  }
  agents: {
    name: string
    role: string
    tasksCount: number
    completedCount: number
    successRate: number
  }[]
  generatedAt: string
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
  if (!dateStr) return "-"
  return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR })
}

function addHeader(doc: jsPDF, title: string) {
  const pageWidth = doc.internal.pageSize.getWidth()

  // Brand bar
  doc.setFillColor(37, 99, 235) // blue-600
  doc.rect(0, 0, pageWidth, 28, "F")

  // Title
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  doc.text("Task Control Center", 14, 12)

  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.text(title, 14, 20)

  // Date
  const dateStr = format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })
  doc.setFontSize(8)
  doc.text(dateStr, pageWidth - 14, 20, { align: "right" })

  doc.setTextColor(0, 0, 0)
}

function addFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    const pageHeight = doc.internal.pageSize.getHeight()
    const pageWidth = doc.internal.pageSize.getWidth()

    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text(
      `Pagina ${i} de ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    )
    doc.text(
      "Task Control Center - Relatorio gerado automaticamente",
      14,
      pageHeight - 10
    )
  }
}

// ---------------------------------------------------------------------------
// Generate Tasks PDF
// ---------------------------------------------------------------------------

export function generateTasksPDF(tasks: ExportTask[]): Uint8Array {
  const doc = new jsPDF({ orientation: "landscape" })
  addHeader(doc, `Exportacao de Tarefas (${tasks.length})`)

  const tableData = tasks.map((t) => [
    t.title.length > 40 ? t.title.substring(0, 40) + "..." : t.title,
    STATUS_LABELS[t.status] || t.status,
    PRIORITY_LABELS[t.priority] || t.priority,
    t.agent?.name || "-",
    formatDate(t.createdAt),
    formatDate(t.dueDate),
    t.estimatedHours != null ? `${t.estimatedHours}h` : "-",
    t.tags?.map((tag) => tag.name).join(", ") || "-",
  ])

  autoTable(doc, {
    startY: 34,
    head: [["Titulo", "Status", "Prioridade", "Agente", "Criada", "Prazo", "Estimativa", "Tags"]],
    body: tableData,
    styles: {
      fontSize: 8,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250],
    },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 25, halign: "center" },
      2: { cellWidth: 22, halign: "center" },
      3: { cellWidth: 30 },
      4: { cellWidth: 25, halign: "center" },
      5: { cellWidth: 25, halign: "center" },
      6: { cellWidth: 22, halign: "center" },
      7: { cellWidth: 40 },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 1) {
        const status = tasks[data.row.index]?.status
        if (status === "DONE") data.cell.styles.textColor = [34, 197, 94]
        else if (status === "BLOCKED") data.cell.styles.textColor = [239, 68, 68]
        else if (status === "IN_PROGRESS") data.cell.styles.textColor = [59, 130, 246]
      }
      if (data.section === "body" && data.column.index === 2) {
        const priority = tasks[data.row.index]?.priority
        if (priority === "URGENT") data.cell.styles.textColor = [239, 68, 68]
        else if (priority === "HIGH") data.cell.styles.textColor = [249, 115, 22]
      }
    },
  })

  addFooter(doc)
  return new Uint8Array(doc.output("arraybuffer"))
}

// ---------------------------------------------------------------------------
// Generate Report PDF
// ---------------------------------------------------------------------------

export function generateReportPDF(data: ReportData): Uint8Array {
  const doc = new jsPDF()
  addHeader(doc, "Relatorio Completo de Desempenho")

  let y = 38

  // --- Section: Summary Metrics ---
  doc.setFontSize(13)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(37, 99, 235)
  doc.text("Resumo Geral", 14, y)
  y += 8

  const metrics = [
    ["Total de Tarefas", String(data.metrics.total)],
    ["Concluidas", String(data.metrics.completed)],
    ["Em Progresso", String(data.metrics.inProgress)],
    ["A Fazer", String(data.metrics.todo)],
    ["Em Revisao", String(data.metrics.review)],
    ["Bloqueadas", String(data.metrics.blocked)],
    ["Taxa de Conclusao", `${data.metrics.completionRate.toFixed(1)}%`],
    ["Tempo Medio de Conclusao", data.metrics.avgCompletionHours != null ? `${data.metrics.avgCompletionHours.toFixed(1)}h` : "-"],
  ]

  autoTable(doc, {
    startY: y,
    body: metrics,
    theme: "plain",
    styles: { fontSize: 10, cellPadding: 4 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 80, textColor: [60, 60, 60] },
      1: { halign: "left", textColor: [37, 99, 235] as [number, number, number], fontStyle: "bold" },
    },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 12

  // --- Section: Status Distribution (text-based chart) ---
  doc.setFontSize(13)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(37, 99, 235)
  doc.text("Distribuicao por Status", 14, y)
  y += 8

  const statusEntries = [
    { label: "A Fazer", value: data.metrics.todo, color: [100, 116, 139] as [number, number, number] },
    { label: "Em Progresso", value: data.metrics.inProgress, color: [59, 130, 246] as [number, number, number] },
    { label: "Em Revisao", value: data.metrics.review, color: [234, 179, 8] as [number, number, number] },
    { label: "Concluidas", value: data.metrics.completed, color: [34, 197, 94] as [number, number, number] },
    { label: "Bloqueadas", value: data.metrics.blocked, color: [239, 68, 68] as [number, number, number] },
  ]

  const maxVal = Math.max(...statusEntries.map((e) => e.value), 1)
  const barMaxWidth = 100

  for (const entry of statusEntries) {
    const barWidth = (entry.value / maxVal) * barMaxWidth

    doc.setFontSize(9)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(80, 80, 80)
    doc.text(entry.label, 14, y + 4)

    doc.setFillColor(...entry.color)
    doc.roundedRect(60, y - 1, Math.max(barWidth, 2), 6, 1, 1, "F")

    doc.setFontSize(9)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(60, 60, 60)
    doc.text(String(entry.value), 60 + barWidth + 4, y + 4)

    y += 10
  }

  y += 6

  // --- Section: Agent Performance ---
  if (data.agents.length > 0) {
    doc.setFontSize(13)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(37, 99, 235)
    doc.text("Desempenho dos Agentes", 14, y)
    y += 4

    const agentData = data.agents.map((a) => [
      a.name,
      a.role,
      String(a.tasksCount),
      String(a.completedCount),
      `${a.successRate.toFixed(1)}%`,
    ])

    autoTable(doc, {
      startY: y,
      head: [["Nome", "Funcao", "Tarefas", "Concluidas", "Taxa Sucesso"]],
      body: agentData,
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      alternateRowStyles: { fillColor: [245, 247, 250] },
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 12
  }

  // --- Section: Task List ---
  if (y > 240) {
    doc.addPage()
    y = 20
  }

  doc.setFontSize(13)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(37, 99, 235)
  doc.text("Lista de Tarefas", 14, y)
  y += 4

  const taskRows = data.tasks.map((t) => [
    t.title.length > 50 ? t.title.substring(0, 50) + "..." : t.title,
    STATUS_LABELS[t.status] || t.status,
    PRIORITY_LABELS[t.priority] || t.priority,
    t.agent?.name || "-",
    formatDate(t.createdAt),
  ])

  autoTable(doc, {
    startY: y,
    head: [["Titulo", "Status", "Prioridade", "Agente", "Criada"]],
    body: taskRows,
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
    },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 28, halign: "center" },
      2: { cellWidth: 24, halign: "center" },
      3: { cellWidth: 30 },
      4: { cellWidth: 25, halign: "center" },
    },
  })

  addFooter(doc)
  return new Uint8Array(doc.output("arraybuffer"))
}
