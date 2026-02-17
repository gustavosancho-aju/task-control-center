// ---------------------------------------------------------------------------
// Dashboard Widget System — Types & Configuration
// ---------------------------------------------------------------------------

export type WidgetType =
  | "stats-cards"
  | "task-list"
  | "kanban-mini"
  | "executions-list"
  | "agent-status"
  | "productivity-chart"
  | "status-chart"
  | "quick-actions"

export type WidgetSize = "small" | "medium" | "large" | "full"

export interface WidgetConfig {
  id: string
  type: WidgetType
  size: WidgetSize
}

export interface DashboardLayout {
  widgets: WidgetConfig[]
}

// ---------------------------------------------------------------------------
// Widget Registry — metadata for each widget type
// ---------------------------------------------------------------------------

export interface WidgetMeta {
  type: WidgetType
  label: string
  description: string
  icon: string // lucide icon name
  defaultSize: WidgetSize
  allowedSizes: WidgetSize[]
}

export const WIDGET_REGISTRY: Record<WidgetType, WidgetMeta> = {
  "stats-cards": {
    type: "stats-cards",
    label: "Cartões de Métricas",
    description: "Métricas rápidas: total, progresso, conclusões e bloqueios",
    icon: "BarChart3",
    defaultSize: "full",
    allowedSizes: ["full"],
  },
  "task-list": {
    type: "task-list",
    label: "Tarefas Recentes",
    description: "Lista das tarefas mais recentes com status e prioridade",
    icon: "ListTodo",
    defaultSize: "medium",
    allowedSizes: ["small", "medium", "large"],
  },
  "kanban-mini": {
    type: "kanban-mini",
    label: "Kanban Compacto",
    description: "Visão resumida do quadro Kanban com contadores por coluna",
    icon: "Columns3",
    defaultSize: "full",
    allowedSizes: ["large", "full"],
  },
  "executions-list": {
    type: "executions-list",
    label: "Execuções Ativas",
    description: "Lista de execuções em andamento com progresso em tempo real",
    icon: "Zap",
    defaultSize: "medium",
    allowedSizes: ["small", "medium", "large"],
  },
  "agent-status": {
    type: "agent-status",
    label: "Status dos Agentes",
    description: "Status atual de cada agente e suas tarefas atribuídas",
    icon: "Bot",
    defaultSize: "medium",
    allowedSizes: ["small", "medium", "large"],
  },
  "productivity-chart": {
    type: "productivity-chart",
    label: "Gráfico de Produtividade",
    description: "Tarefas concluídas nos últimos 7 dias em gráfico de barras",
    icon: "TrendingUp",
    defaultSize: "medium",
    allowedSizes: ["medium", "large"],
  },
  "status-chart": {
    type: "status-chart",
    label: "Distribuição por Status",
    description: "Gráfico pizza com distribuição das tarefas por status",
    icon: "PieChart",
    defaultSize: "medium",
    allowedSizes: ["medium", "large"],
  },
  "quick-actions": {
    type: "quick-actions",
    label: "Ações Rápidas",
    description: "Atalhos para ações frequentes: criar tarefa, kanban, etc.",
    icon: "Rocket",
    defaultSize: "small",
    allowedSizes: ["small", "medium"],
  },
}

// ---------------------------------------------------------------------------
// Default Layout
// ---------------------------------------------------------------------------

export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayout = {
  widgets: [
    { id: "w-1", type: "stats-cards", size: "full" },
    { id: "w-2", type: "task-list", size: "medium" },
    { id: "w-3", type: "executions-list", size: "medium" },
    { id: "w-4", type: "agent-status", size: "medium" },
    { id: "w-5", type: "productivity-chart", size: "medium" },
  ],
}

// ---------------------------------------------------------------------------
// Shared data context for widgets
// ---------------------------------------------------------------------------

export interface DashboardData {
  tasks: DashboardTask[]
  agents: DashboardAgent[]
  activeExecutions: DashboardExecution[]
  loading: boolean
  onRefresh: () => void
}

export interface DashboardTask {
  id: string
  title: string
  description?: string | null
  status: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE" | "BLOCKED"
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"
  createdAt: string
  completedAt?: string | null
  agent?: { id: string; name: string; role: "MAESTRO" | "SENTINEL" | "ARCHITECTON" | "PIXEL" } | null
  agentId?: string | null
}

export interface DashboardAgent {
  id: string
  name: string
  role: string
  isActive?: boolean
  _count?: { tasks: number; executions: number }
}

export interface DashboardExecution {
  id: string
  taskId: string
  agentId: string
  status: "QUEUED" | "RUNNING" | "PAUSED" | "COMPLETED" | "FAILED" | "CANCELLED"
  progress: number
  startedAt: string | null
  task?: { id: string; title: string; status: string; priority: string }
  agent?: { id: string; name: string; role: "MAESTRO" | "SENTINEL" | "ARCHITECTON" | "PIXEL" }
}
