import { NextRequest, NextResponse } from 'next/server'
import { maestroOrchestrator } from '@/lib/agents/maestro-orchestrator'

/**
 * POST /api/orchestrate/preview
 *
 * Gera um plano de orquestração SEM criar registros no banco.
 * Útil para mostrar ao usuário o que o Maestro vai criar antes de confirmar.
 *
 * Body:
 *   title       — Título da tarefa (obrigatório)
 *   description — Descrição opcional
 *   priority    — Prioridade (default: "MEDIUM")
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, description, priority = 'MEDIUM' } = body as {
      title: string
      description?: string
      priority?: string
    }

    if (!title?.trim() || title.trim().length < 3) {
      return NextResponse.json(
        { success: false, error: 'Título deve ter pelo menos 3 caracteres' },
        { status: 400 }
      )
    }

    // Mock de Task — apenas os campos que planTask() usa
    const mockTask = {
      id: 'preview',
      title: title.trim(),
      description: description?.trim() ?? null,
      priority: priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
      status: 'TODO' as const,
      estimatedHours: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      agentId: null,
      agentName: null,
      agentRole: null,
      parentId: null,
      orchestrationId: null,
      executionOrder: null,
    }

    const plan = await maestroOrchestrator.planTask(mockTask as never)

    // Calcula estatísticas do plano
    const agentsUsed = [
      ...new Set(
        plan.phases.flatMap((phase) => phase.subtasks.map((s) => s.agent))
      ),
    ]
    const totalSubtasks = plan.phases.reduce(
      (sum, phase) => sum + phase.subtasks.length,
      0
    )

    return NextResponse.json({
      success: true,
      data: {
        plan,
        stats: {
          totalPhases: plan.phases.length,
          totalSubtasks,
          agentsUsed,
          estimatedTotalHours: plan.estimatedTotalHours,
        },
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('POST /api/orchestrate/preview error:', error)
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
