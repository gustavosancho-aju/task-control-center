"use client"

import { useState, useMemo } from "react"
import dynamic from "next/dynamic"
import { useQueryClient } from "@tanstack/react-query"
import { Header } from "@/components/layout/Header"
import { StatsCards } from "@/components/analytics/StatsCards"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { RefreshCw, Sparkles } from "lucide-react"

const StatusChart = dynamic(
  () => import("@/components/analytics/StatusChart").then((m) => ({ default: m.StatusChart })),
  { ssr: false, loading: () => <Skeleton className="h-[380px] rounded-xl" /> }
)
const ProductivityChart = dynamic(
  () => import("@/components/analytics/ProductivityChart").then((m) => ({ default: m.ProductivityChart })),
  { ssr: false, loading: () => <Skeleton className="h-[380px] rounded-xl" /> }
)
const AgentChart = dynamic(
  () => import("@/components/analytics/AgentChart").then((m) => ({ default: m.AgentChart })),
  { ssr: false, loading: () => <Skeleton className="h-[380px] rounded-xl" /> }
)
import { ExportButton } from "@/components/export/ExportButton"
import { subDays, isAfter } from "date-fns"
import { useTasks } from "@/lib/hooks/use-tasks"

interface Task {
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

type Period = "7d" | "30d" | "all"

export default function AnalyticsPage() {
  const queryClient = useQueryClient()
  const tasksQuery = useTasks({ limit: 100 })
  const tasks = (tasksQuery.data?.data ?? []) as Task[]
  const loading = tasksQuery.isLoading
  const [period, setPeriod] = useState<Period>("all")

  const filteredTasks = useMemo(() => {
    if (period === "all") return tasks

    const days = period === "7d" ? 7 : 30
    const cutoff = subDays(new Date(), days)

    return tasks.filter((t) => isAfter(new Date(t.createdAt), cutoff))
  }, [tasks, period])

  return (
    <div className="min-h-screen bg-muted/40">
      <Header />
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Analytics & Métricas</h1>
            <p className="text-sm text-muted-foreground">
              Visão geral do desempenho e produtividade do time
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Últimos 7 dias</SelectItem>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
                <SelectItem value="all">Todo o período</SelectItem>
              </SelectContent>
            </Select>

            <ExportButton
              endpoint="/api/export/report"
              formats={["pdf", "xlsx"]}
              label="Exportar Relatorio"
            />

            <Button variant="outline" size="icon" onClick={() => queryClient.invalidateQueries({ queryKey: ["tasks"] })}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : (
          <StatsCards tasks={filteredTasks} />
        )}

        {/* Charts Grid */}
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[380px] rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <StatusChart tasks={filteredTasks} />
            <ProductivityChart tasks={filteredTasks} />
            <AgentChart tasks={filteredTasks} />

            {/* Placeholder */}
            <div className="bg-card rounded-xl border p-6 shadow-sm flex flex-col items-center justify-center text-center gap-3 min-h-[300px]">
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-purple-50 dark:bg-purple-900/20">
                <Sparkles className="h-6 w-6 text-purple-500 dark:text-purple-400" />
              </div>
              <h3 className="font-semibold">Próximas Funcionalidades</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>Gráfico de velocidade do time</li>
                <li>Previsão de conclusão com IA</li>
                <li>Heatmap de atividade semanal</li>
                <li>Relatórios automatizados</li>
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
