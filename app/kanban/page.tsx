"use client"

import { useState, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { Header } from "@/components/layout/Header"
import { KanbanBoard } from "@/components/kanban/KanbanBoard"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { notifyStatusChanged, notifyError } from "@/lib/notifications"
import { useTasks } from "@/lib/hooks/use-tasks"
import { useAgents } from "@/lib/hooks/use-agents"
import { KanbanBoardSkeleton } from "@/components/ui/skeletons"

interface Task {
  id: string
  title: string
  description?: string | null
  status: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE" | "BLOCKED"
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"
  createdAt: string
  agent?: { id: string; name: string; role: "MAESTRO" | "SENTINEL" | "ARCHITECTON" | "PIXEL" } | null
  agentId?: string | null
  dueDate?: string | null
}

export default function KanbanPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const tasksQuery = useTasks({ limit: 100 })
  const agentsQuery = useAgents()
  const tasks = (tasksQuery.data?.data ?? []) as Task[]
  const agents = (agentsQuery.data ?? []) as { id: string; name: string; role: string }[]
  const loading = tasksQuery.isLoading
  const [agentFilter, setAgentFilter] = useState("ALL")
  const [priorityFilter, setPriorityFilter] = useState("ALL")

  const filteredTasks = useMemo(() => {
    let result = tasks
    if (agentFilter === "NO_AGENT") {
      result = result.filter((t) => !t.agentId)
    } else if (agentFilter !== "ALL") {
      result = result.filter((t) => t.agentId === agentFilter)
    }
    if (priorityFilter !== "ALL") {
      result = result.filter((t) => t.priority === priorityFilter)
    }
    return result
  }, [tasks, agentFilter, priorityFilter])

  const handleTaskMove = useCallback(async (taskId: string, newStatus: string) => {
    const task = tasks.find((t) => t.id === taskId)
    const previousStatus = task?.status ?? ""

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await res.json()

      if (!data.success) {
        notifyError("Erro ao mover tarefa", data.error)
        return
      }

      notifyStatusChanged(task?.title ?? "Tarefa", previousStatus, newStatus)
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
    } catch {
      notifyError("Erro ao mover tarefa", "Falha na conexão com o servidor")
    }
  }, [tasks, queryClient])

  const handleTaskClick = useCallback((taskId: string) => {
    router.push(`/tasks/${taskId}`)
  }, [router])

  return (
    <div className="min-h-screen bg-muted/40">
      <Header />
      <main className="container mx-auto px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Kanban Board</h1>
            <p className="text-sm text-muted-foreground">
              Arraste as tarefas entre colunas para atualizar o status
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas Prioridades</SelectItem>
                <SelectItem value="URGENT">Urgente</SelectItem>
                <SelectItem value="HIGH">Alta</SelectItem>
                <SelectItem value="MEDIUM">Média</SelectItem>
                <SelectItem value="LOW">Baixa</SelectItem>
              </SelectContent>
            </Select>

            <Select value={agentFilter} onValueChange={setAgentFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Agente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos Agentes</SelectItem>
                <SelectItem value="NO_AGENT">Sem Agente</SelectItem>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon" onClick={() => queryClient.invalidateQueries({ queryKey: ["tasks"] })}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {loading ? (
          <KanbanBoardSkeleton />
        ) : (
          <KanbanBoard
            tasks={filteredTasks}
            onTaskMove={handleTaskMove}
            onTaskClick={handleTaskClick}
          />
        )}
      </main>
    </div>
  )
}
