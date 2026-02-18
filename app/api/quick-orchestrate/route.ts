import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db'
import { maestroOrchestrator } from '@/lib/agents/maestro-orchestrator'
import { TaskStatus } from '@prisma/client'
import { logTaskCreate } from '@/lib/audit/logger'
import { cache } from '@/lib/cache'

const QuickOrchestrateSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
})

/**
 * POST /api/quick-orchestrate
 *
 * Cria uma tarefa e inicia a orquestração em um único request.
 *
 * Body:
 *   title       — título da tarefa (obrigatório)
 *   description — descrição opcional
 *   priority    — LOW | MEDIUM | HIGH | URGENT (default: MEDIUM)
 *
 * Returns:
 *   { taskId, orchestrationId, redirectUrl }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = QuickOrchestrateSchema.parse(body)

    // ── 1. Criar tarefa ───────────────────────────────────────────────────
    const task = await prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        priority: data.priority as never,
        statusHistory: {
          create: {
            fromStatus: null,
            toStatus: TaskStatus.TODO,
            notes: 'Tarefa criada via Quick Orchestrate',
          },
        },
      },
      select: { id: true, title: true, status: true },
    })

    logTaskCreate(task.id, task.title)
    cache.invalidatePattern('tasks:*')

    // ── 2. Iniciar orquestração ───────────────────────────────────────────
    const result = await maestroOrchestrator.orchestrate(task.id)

    // Fire-and-forget: loop contínuo que processa + monitora até orquestração completar
    const orchestrationId = result.orchestrationId
    ;(async () => {
      const { autoProcessor } = await import('@/lib/agents/auto-processor')
      const { maestroOrchestrator: maestro } = await import('@/lib/agents/maestro-orchestrator')
      const MAX_TICKS = 50
      for (let i = 0; i < MAX_TICKS; i++) {
        try {
          await autoProcessor.tick()
          const orch = await prisma.orchestration.findUnique({
            where: { id: orchestrationId },
            select: { status: true },
          })
          if (!orch || ['COMPLETED', 'FAILED'].includes(orch.status)) break
          await maestro.monitorExecution(orchestrationId)
          await new Promise(resolve => setTimeout(resolve, 3000))
        } catch (err) {
          console.warn(`[quick-orchestrate] Tick ${i} error:`, err)
          break
        }
      }
    })().catch((err: unknown) =>
      console.warn('[quick-orchestrate] Processing loop error:', err)
    )

    // ── 3. Retornar resultado ─────────────────────────────────────────────
    const redirectUrl = `/orchestration/${result.orchestrationId}`

    return NextResponse.json(
      {
        success: true,
        data: {
          taskId: task.id,
          orchestrationId: result.orchestrationId,
          redirectUrl,
          subtasksCreated: result.subtasksCreated,
        },
        message: `Tarefa criada e orquestração iniciada: ${result.subtasksCreated} subtarefas`,
      },
      { status: 201 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('POST /api/quick-orchestrate error:', error)

    const isValidation = error instanceof z.ZodError
    const isClientError =
      isValidation ||
      message.includes('já existe') ||
      message.includes('já concluída')

    return NextResponse.json(
      {
        success: false,
        error: isValidation ? 'Dados inválidos: title é obrigatório' : message,
      },
      { status: isClientError ? 400 : 500 }
    )
  }
}
