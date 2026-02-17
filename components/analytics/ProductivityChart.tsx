"use client"

import { useMemo } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { format, subDays, startOfDay } from "date-fns"
import { ptBR } from "date-fns/locale"

interface Task {
  id: string
  status: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE" | "BLOCKED"
  completedAt?: string | null
}

interface ProductivityChartProps {
  tasks: Task[]
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null
  const count = payload[0].value
  return (
    <div className="bg-card rounded-lg border shadow-md px-3 py-2 text-sm">
      <p className="font-medium">{label}</p>
      <p className="text-muted-foreground mt-1">
        {count} {count === 1 ? "tarefa concluída" : "tarefas concluídas"}
      </p>
    </div>
  )
}

export function ProductivityChart({ tasks }: ProductivityChartProps) {
  const { data, totalCompleted } = useMemo(() => {
    const today = startOfDay(new Date())

    // Build 7-day buckets
    const days: { key: string; label: string; count: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const day = subDays(today, i)
      days.push({
        key: format(day, "yyyy-MM-dd"),
        label: format(day, "EEE dd/MM", { locale: ptBR }),
        count: 0,
      })
    }

    // Count completed tasks per day
    const dayMap = new Map(days.map((d) => [d.key, d]))

    for (const task of tasks) {
      if (task.status !== "DONE" || !task.completedAt) continue
      const key = format(startOfDay(new Date(task.completedAt)), "yyyy-MM-dd")
      const bucket = dayMap.get(key)
      if (bucket) bucket.count++
    }

    const chartData = days.map((d) => ({ name: d.label, concluidas: d.count }))
    const total = days.reduce((sum, d) => sum + d.count, 0)

    return { data: chartData, totalCompleted: total }
  }, [tasks])

  return (
    <div className="bg-card rounded-xl border p-6 shadow-sm">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="font-semibold">Produtividade - Últimos 7 dias</h3>
        <span className="text-sm text-muted-foreground">
          {totalCompleted} {totalCompleted === 1 ? "concluída" : "concluídas"}
        </span>
      </div>

      {totalCompleted === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Nenhuma tarefa concluída nos últimos 7 dias
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: "#94a3b8" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 12, fill: "#94a3b8" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f1f5f9" }} />
            <Bar dataKey="concluidas" fill="#22c55e" radius={[6, 6, 0, 0]} maxBarSize={48} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
