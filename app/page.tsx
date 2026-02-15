"use client"
import { useEffect, useState } from "react"
import { Header } from "@/components/layout/Header"
import { TaskList } from "@/components/tasks/TaskList"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Task {
  id: string
  title: string
  description?: string | null
  status: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE" | "BLOCKED"
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"
  createdAt: string
  agent?: { id: string; name: string; role: "MAESTRO" | "SENTINEL" | "ARCHITECTON" | "PIXEL" } | null
}

export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>("ALL")

  const fetchTasks = async () => {
    try {
      const params = statusFilter !== "ALL" ? `?status=${statusFilter}` : ""
      const res = await fetch(`/api/tasks${params}`)
      const data = await res.json()
      if (data.success) setTasks(data.data)
    } catch (error) {
      console.error("Erro ao buscar tarefas:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()
  }, [statusFilter])

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) fetchTasks()
    } catch (error) {
      console.error("Erro ao atualizar status:", error)
    }
  }

  const stats = {
    total: tasks.length,
    todo: tasks.filter(t => t.status === "TODO").length,
    inProgress: tasks.filter(t => t.status === "IN_PROGRESS").length,
    review: tasks.filter(t => t.status === "REVIEW").length,
    done: tasks.filter(t => t.status === "DONE").length,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Gerencie as tarefas do Agency Dev Squad</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <p className="text-sm text-muted-foreground">A Fazer</p>
            <p className="text-2xl font-bold text-slate-600">{stats.todo}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <p className="text-sm text-muted-foreground">Em Progresso</p>
            <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <p className="text-sm text-muted-foreground">Concluidas</p>
            <p className="text-2xl font-bold text-green-600">{stats.done}</p>
          </div>
        </div>

        <div className="flex justify-between items-center mb-6">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrar status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              <SelectItem value="TODO">A Fazer</SelectItem>
              <SelectItem value="IN_PROGRESS">Em Progresso</SelectItem>
              <SelectItem value="REVIEW">Em Revisao</SelectItem>
              <SelectItem value="DONE">Concluido</SelectItem>
              <SelectItem value="BLOCKED">Bloqueado</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchTasks} variant="outline">Atualizar</Button>
        </div>

        {loading ? (
          <p className="text-center py-12 text-muted-foreground">Carregando...</p>
        ) : (
          <TaskList tasks={tasks} onStatusChange={handleStatusChange} />
        )}
      </main>
    </div>
  )
}
