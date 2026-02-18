import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db'
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
 * Cria uma tarefa e dispara a orquestração em background.
 * Retorna imediatamente com o taskId — a orquestração acontece de forma assíncrona.
 *
 * Isso evita o timeout de 10s do Vercel Hobby plan.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = QuickOrchestrateSchema.parse(body)

    // ── 1. Criar tarefa (rápido, ~200ms) ────────────────────────────────
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

    // ── 2. Disparar orquestração em background (fire-and-forget) ────────
    // NÃO await — retorna o response HTTP imediatamente
    const taskId = task.id
    ;(async () => {
      try {
        const { maestroOrchestrator } = await import('@/lib/agents/maestro-orchestrator')
        const result = await maestroOrchestrator.orchestrate(taskId)
        console.log(`[quick-orchestrate] Orquestração ${result.orchestrationId} criada para "${task.title}"`)

        // Processa a fila imediatamente + loop de monitoramento
        const { autoProcessor } = await import('@/lib/agents/auto-processor')
        const MAX_TICKS = 50
        for (let i = 0; i < MAX_TICKS; i++) {
          await autoProcessor.tick()
          const orch = await prisma.orchestration.findUnique({
            where: { id: result.orchestrationId },
            select: { status: true },
          })
          if (!orch || ['COMPLETED', 'FAILED'].includes(orch.status)) {
            console.log(`[quick-orchestrate] Orquestração finalizada: ${orch?.status}`)
            break
          }
          await maestroOrchestrator.monitorExecution(result.orchestrationId)
          await new Promise(resolve => setTimeout(resolve, 3000))
        }
      } catch (err) {
        console.error(`[quick-orchestrate] Background orchestration failed for "${task.title}":`, err)
      }
    })()

    // ── 3. Retornar imediatamente ───────────────────────────────────────
    return NextResponse.json(
      {
        success: true,
        data: {
          taskId: task.id,
          status: 'ORCHESTRATING',
          redirectUrl: `/tasks/${task.id}`,
        },
        message: 'Tarefa criada. Orquestração iniciada em background.',
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
