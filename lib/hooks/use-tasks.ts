"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

interface TaskFilters {
  status?: string
  priority?: string
  agentId?: string
  search?: string
  limit?: number
  offset?: number
  parentId?: string
}

async function fetchTasks(filters: TaskFilters = {}) {
  const params = new URLSearchParams()
  if (filters.status) params.set("status", filters.status)
  if (filters.priority) params.set("priority", filters.priority)
  if (filters.agentId) params.set("agentId", filters.agentId)
  if (filters.search) params.set("search", filters.search)
  if (filters.limit) params.set("limit", String(filters.limit))
  if (filters.offset) params.set("offset", String(filters.offset))
  if (filters.parentId) params.set("parentId", filters.parentId)

  const res = await fetch(`/api/tasks?${params.toString()}`)
  if (!res.ok) throw new Error("Erro ao buscar tarefas")
  const data = await res.json()
  if (!data.success) throw new Error(data.error || "Erro ao buscar tarefas")
  return data
}

async function fetchTask(id: string) {
  const res = await fetch(`/api/tasks/${id}`)
  if (!res.ok) throw new Error("Erro ao buscar tarefa")
  const data = await res.json()
  if (!data.success) throw new Error(data.error || "Erro ao buscar tarefa")
  return data.data
}

export function useTasks(filters: TaskFilters = {}) {
  return useQuery({
    queryKey: ["tasks", filters],
    queryFn: () => fetchTasks(filters),
  })
}

export function useTask(id: string) {
  return useQuery({
    queryKey: ["task", id],
    queryFn: () => fetchTask(id),
    enabled: !!id,
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (task: { title: string; description?: string; priority?: string; [key: string]: unknown }) => {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(task),
      })
      if (!res.ok) throw new Error("Erro ao criar tarefa")
      const data = await res.json()
      if (!data.success) throw new Error(data.error || "Erro ao criar tarefa")
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
    },
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: unknown }) => {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Erro ao atualizar tarefa")
      }
      const data = await res.json()
      if (!data.success) throw new Error(data.error || "Erro ao atualizar tarefa")
      return data.data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
      queryClient.invalidateQueries({ queryKey: ["task", variables.id] })
    },
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Erro ao deletar tarefa")
      const data = await res.json()
      if (!data.success) throw new Error(data.error || "Erro ao deletar tarefa")
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
    },
  })
}
