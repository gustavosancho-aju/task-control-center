"use client"

import { useMemo } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

interface Task {
  id: string
  status: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE" | "BLOCKED"
  agent?: { id: string; name: string } | null
  agentId?: string | null
}

interface AgentChartProps {
  tasks: Task[]
}

const STATUS_CONFIG = {
  TODO: { label: "A Fazer", color: "#64748b" },
  IN_PROGRESS: { label: "Em Progresso", color: "#3b82f6" },
  REVIEW: { label: "Em Revisão", color: "#eab308" },
  DONE: { label: "Concluído", color: "#22c55e" },
  BLOCKED: { label: "Bloqueado", color: "#ef4444" },
} as const

const STATUSES = ["TODO", "IN_PROGRESS", "REVIEW", "DONE", "BLOCKED"] as const

type StatusKey = (typeof STATUSES)[number]

interface AgentRow {
  name: string
  total: number
  TODO: number
  IN_PROGRESS: number
  REVIEW: number
  DONE: number
  BLOCKED: number
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  const total = payload.reduce((s, p) => s + p.value, 0)
  return (
    <div className="bg-card rounded-lg border shadow-md px-3 py-2 text-sm min-w-[140px]">
      <p className="font-medium mb-1.5">{label}</p>
      {payload.filter((p) => p.value > 0).map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
            <span className="text-muted-foreground">{p.name}</span>
          </div>
          <span className="font-medium">{p.value}</span>
        </div>
      ))}
      <div className="border-t mt-1.5 pt-1.5 flex justify-between font-medium">
        <span>Total</span>
        <span>{total}</span>
      </div>
    </div>
  )
}

export function AgentChart({ tasks }: AgentChartProps) {
  const data = useMemo(() => {
    const map = new Map<string, AgentRow>()

    for (const task of tasks) {
      const key = task.agent?.name ?? "Sem Agente"

      if (!map.has(key)) {
        map.set(key, { name: key, total: 0, TODO: 0, IN_PROGRESS: 0, REVIEW: 0, DONE: 0, BLOCKED: 0 })
      }

      const row = map.get(key)!
      row[task.status]++
      row.total++
    }

    return Array.from(map.values()).sort((a, b) => b.total - a.total)
  }, [tasks])

  if (tasks.length === 0) {
    return (
      <div className="bg-card rounded-xl border p-6 shadow-sm">
        <h3 className="font-semibold mb-4">Tarefas por Agente</h3>
        <p className="text-sm text-muted-foreground text-center py-8">Nenhuma tarefa encontrada</p>
      </div>
    )
  }

  const chartHeight = Math.max(250, data.length * 48)

  return (
    <div className="bg-card rounded-xl border p-6 shadow-sm">
      <h3 className="font-semibold mb-4">Tarefas por Agente</h3>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fontSize: 12, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={100}
            tick={{ fontSize: 12, fill: "#64748b" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8fafc" }} />
          <Legend
            verticalAlign="top"
            iconType="circle"
            iconSize={10}
            wrapperStyle={{ paddingBottom: 12 }}
            formatter={(value: string) => <span className="text-sm text-muted-foreground">{value}</span>}
          />
          {STATUSES.map((status) => (
            <Bar
              key={status}
              dataKey={status}
              name={STATUS_CONFIG[status].label}
              fill={STATUS_CONFIG[status].color}
              stackId="status"
              radius={0}
              maxBarSize={28}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
