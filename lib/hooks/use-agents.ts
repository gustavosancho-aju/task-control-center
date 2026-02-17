"use client"

import { useQuery } from "@tanstack/react-query"

async function fetchAgents(activeOnly = true) {
  const res = await fetch(`/api/agents${activeOnly ? "" : "?active=false"}`)
  if (!res.ok) throw new Error("Erro ao buscar agentes")
  const data = await res.json()
  if (!data.success) throw new Error(data.error || "Erro ao buscar agentes")
  return data.data
}

export function useAgents(activeOnly = true) {
  return useQuery({
    queryKey: ["agents", activeOnly],
    queryFn: () => fetchAgents(activeOnly),
    staleTime: 5 * 60 * 1000,
  })
}
