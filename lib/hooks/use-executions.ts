"use client"

import { useQuery } from "@tanstack/react-query"

interface ExecutionFilters {
  taskId?: string
  agentId?: string
  status?: string
  limit?: number
  offset?: number
}

async function fetchExecutions(filters: ExecutionFilters = {}) {
  const params = new URLSearchParams()
  if (filters.taskId) params.set("taskId", filters.taskId)
  if (filters.agentId) params.set("agentId", filters.agentId)
  if (filters.status) params.set("status", filters.status)
  if (filters.limit) params.set("limit", String(filters.limit))
  if (filters.offset) params.set("offset", String(filters.offset))

  const res = await fetch(`/api/executions?${params.toString()}`)
  if (!res.ok) throw new Error("Erro ao buscar execuções")
  const data = await res.json()
  if (!data.success) throw new Error(data.error || "Erro ao buscar execuções")
  return data
}

export function useExecutions(filters: ExecutionFilters = {}) {
  return useQuery({
    queryKey: ["executions", filters],
    queryFn: () => fetchExecutions(filters),
  })
}

export function useActiveExecutions() {
  const runningQuery = useQuery({
    queryKey: ["executions", { status: "RUNNING", limit: 20 }],
    queryFn: () => fetchExecutions({ status: "RUNNING", limit: 20 }),
    refetchInterval: 3000,
  })

  const pausedQuery = useQuery({
    queryKey: ["executions", { status: "PAUSED", limit: 20 }],
    queryFn: () => fetchExecutions({ status: "PAUSED", limit: 20 }),
    refetchInterval: 3000,
  })

  const running = runningQuery.data?.data ?? []
  const paused = pausedQuery.data?.data ?? []

  return {
    data: [...running, ...paused],
    isLoading: runningQuery.isLoading || pausedQuery.isLoading,
    error: runningQuery.error || pausedQuery.error,
  }
}
