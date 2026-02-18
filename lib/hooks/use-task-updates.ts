"use client"

import { useEffect, useRef } from "react"
import { useQueryClient } from "@tanstack/react-query"

/**
 * Hook que conecta ao SSE stream de eventos dos agentes e invalida
 * automaticamente o cache do React Query quando tarefas mudam de status.
 *
 * Usar em qualquer página que exibe tarefas e precisa de atualização em tempo real.
 */
export function useTaskUpdates() {
  const queryClient = useQueryClient()
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    const es = new EventSource("/api/events/stream")
    eventSourceRef.current = es

    es.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data)
        const eventType = payload?.type ?? payload?.event ?? ""

        // Invalida cache de tasks em qualquer evento relevante de execução
        const taskEvents = [
          "EXECUTION_STARTED",
          "EXECUTION_COMPLETED",
          "EXECUTION_FAILED",
          "EXECUTION_PROGRESS",
          "QUEUE_PROCESSED",
          "QUEUE_ADDED",
        ]

        if (taskEvents.includes(eventType)) {
          queryClient.invalidateQueries({ queryKey: ["tasks"] })

          // Invalida task individual se taskId disponível
          const taskId = payload?.meta?.taskId ?? payload?.taskId
          if (taskId) {
            queryClient.invalidateQueries({ queryKey: ["task", taskId] })
          }

          // Invalida execuções e orquestrações também
          queryClient.invalidateQueries({ queryKey: ["executions"] })
          queryClient.invalidateQueries({ queryKey: ["orchestrations"] })
        }
      } catch {
        // Ignora heartbeats e mensagens inválidas
      }
    }

    es.onerror = () => {
      // Reconecta automaticamente (comportamento padrão do EventSource)
    }

    return () => {
      es.close()
      eventSourceRef.current = null
    }
  }, [queryClient])
}
