"use client"

import { useMemo } from "react"
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

interface Task {
  id: string
  status: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE" | "BLOCKED"
}

interface StatusChartProps {
  tasks: Task[]
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  TODO: { label: "A Fazer", color: "#64748b" },
  IN_PROGRESS: { label: "Em Progresso", color: "#3b82f6" },
  REVIEW: { label: "Em Revisão", color: "#eab308" },
  DONE: { label: "Concluído", color: "#22c55e" },
  BLOCKED: { label: "Bloqueado", color: "#ef4444" },
}

const STATUSES = ["TODO", "IN_PROGRESS", "REVIEW", "DONE", "BLOCKED"] as const

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { fill: string } }> }) {
  if (!active || !payload?.length) return null
  const { name, value, payload: item } = payload[0]
  return (
    <div className="bg-card rounded-lg border shadow-md px-3 py-2 text-sm">
      <div className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: item.fill }} />
        <span className="font-medium">{name}</span>
      </div>
      <p className="text-muted-foreground mt-1">
        {value} {value === 1 ? "tarefa" : "tarefas"}
      </p>
    </div>
  )
}

function renderLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: {
  cx?: number
  cy?: number
  midAngle?: number
  innerRadius?: number
  outerRadius?: number
  percent?: number
}) {
  if (cx == null || cy == null || midAngle == null || innerRadius == null || outerRadius == null || percent == null) return null
  if (percent < 0.05) return null
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-xs font-semibold">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

export function StatusChart({ tasks }: StatusChartProps) {
  const data = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const task of tasks) {
      counts[task.status] = (counts[task.status] || 0) + 1
    }
    return STATUSES.filter((s) => counts[s] > 0).map((status) => ({
      name: STATUS_CONFIG[status].label,
      value: counts[status],
      fill: STATUS_CONFIG[status].color,
    }))
  }, [tasks])

  if (tasks.length === 0) {
    return (
      <div className="bg-card rounded-xl border p-6 shadow-sm">
        <h3 className="font-semibold mb-4">Tarefas por Status</h3>
        <p className="text-sm text-muted-foreground text-center py-8">Nenhuma tarefa encontrada</p>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-xl border p-6 shadow-sm">
      <h3 className="font-semibold mb-4">Tarefas por Status</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={100}
            dataKey="value"
            labelLine={false}
            label={renderLabel}
            strokeWidth={2}
            stroke="#fff"
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            iconSize={10}
            formatter={(value: string) => <span className="text-sm text-muted-foreground">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
