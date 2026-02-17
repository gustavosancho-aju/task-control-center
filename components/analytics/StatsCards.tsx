"use client"

import { useMemo } from "react"
import {
  CheckCircle,
  Clock,
  AlertCircle,
  Users,
  TrendingUp,
  ListTodo,
  Eye,
  CalendarPlus,
  CalendarCheck,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Task {
  id: string
  title: string
  status: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE" | "BLOCKED"
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"
  createdAt: string
  completedAt?: string | null
  agentId?: string | null
}

interface StatsCardsProps {
  tasks: Task[]
}

interface StatCard {
  label: string
  value: string | number
  icon: LucideIcon
  color: string
  bgColor: string
  subtitle?: string
}

function isToday(dateStr: string): boolean {
  const date = new Date(dateStr)
  const now = new Date()
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  )
}

function avgCompletionDays(tasks: Task[]): number | null {
  const completed = tasks.filter((t) => t.status === "DONE" && t.completedAt)
  if (completed.length === 0) return null

  const totalMs = completed.reduce((sum, t) => {
    const created = new Date(t.createdAt).getTime()
    const done = new Date(t.completedAt!).getTime()
    return sum + (done - created)
  }, 0)

  return totalMs / completed.length / (1000 * 60 * 60 * 24)
}

export function StatsCards({ tasks }: StatsCardsProps) {
  const stats = useMemo(() => {
    const total = tasks.length
    const todo = tasks.filter((t) => t.status === "TODO").length
    const inProgress = tasks.filter((t) => t.status === "IN_PROGRESS").length
    const review = tasks.filter((t) => t.status === "REVIEW").length
    const done = tasks.filter((t) => t.status === "DONE").length
    const blocked = tasks.filter((t) => t.status === "BLOCKED").length
    const noAgent = tasks.filter((t) => !t.agentId).length
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0
    const avgDays = avgCompletionDays(tasks)
    const createdToday = tasks.filter((t) => isToday(t.createdAt)).length
    const doneToday = tasks.filter(
      (t) => t.status === "DONE" && t.completedAt && isToday(t.completedAt)
    ).length

    return { total, todo, inProgress, review, done, blocked, noAgent, completionRate, avgDays, createdToday, doneToday }
  }, [tasks])

  const cards: StatCard[] = [
    {
      label: "Total de Tarefas",
      value: stats.total,
      icon: ListTodo,
      color: "text-slate-700",
      bgColor: "bg-slate-100",
    },
    {
      label: "A Fazer",
      value: stats.todo,
      icon: ListTodo,
      color: "text-slate-600",
      bgColor: "bg-slate-100",
    },
    {
      label: "Em Progresso",
      value: stats.inProgress,
      icon: Clock,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      label: "Em Revisão",
      value: stats.review,
      icon: Eye,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
    },
    {
      label: "Concluídas",
      value: stats.done,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      label: "Bloqueadas",
      value: stats.blocked,
      icon: AlertCircle,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      label: "Taxa de Conclusão",
      value: `${stats.completionRate}%`,
      icon: TrendingUp,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      subtitle: `${stats.done} de ${stats.total}`,
    },
    {
      label: "Tempo Médio",
      value: stats.avgDays !== null ? `${stats.avgDays.toFixed(1)}d` : "--",
      icon: Clock,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
      subtitle: stats.avgDays !== null ? "dias para concluir" : "sem dados",
    },
    {
      label: "Sem Agente",
      value: stats.noAgent,
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      label: "Criadas Hoje",
      value: stats.createdToday,
      icon: CalendarPlus,
      color: "text-sky-600",
      bgColor: "bg-sky-50",
    },
    {
      label: "Concluídas Hoje",
      value: stats.doneToday,
      icon: CalendarCheck,
      color: "text-teal-600",
      bgColor: "bg-teal-50",
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-card rounded-xl border p-4 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className={cn("flex items-center justify-center h-9 w-9 rounded-lg", card.bgColor)}>
              <card.icon className={cn("h-5 w-5", card.color)} />
            </div>
            <p className="text-xs font-medium text-muted-foreground leading-tight">{card.label}</p>
          </div>
          <p className={cn("text-2xl font-bold", card.color)}>{card.value}</p>
          {card.subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
          )}
        </div>
      ))}
    </div>
  )
}
