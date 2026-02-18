import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

/**
 * POST /api/orchestrate
 *
 * Inicia a orquestração de uma tarefa em background.
 * Retorna imediatamente com status ORCHESTRATING para evitar
 * timeout do Vercel Hobby (10s).
 *
 * Body:
 *   taskId      — ID da tarefa a orquestrar (obrigatório)
 *   autoExecute — se true, aciona o AutoProcessor após enfileirar (default: true)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { taskId, autoExecute = true } = body as {
      taskId: string
      autoExecute?: boolean
    }

    if (!taskId) {
      return NextResponse.json(
        { success: false, error: 'taskId é obrigatório' },
        { status: 400 }
      )
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, title: true, status: true },
    })

    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Tarefa não encontrada' },
        { status: 404 }
      )
    }

    if (task.status === 'DONE') {
      return NextResponse.json(
        { success: false, error: 'Não é possível orquestrar uma tarefa já concluída' },
        { status: 400 }
      )
    }

    // Verifica se já existe orquestração ativa
    const existing = await prisma.orchestration.findUnique({
      where: { parentTaskId: taskId },
    })
    if (existing && !['FAILED'].includes(existing.status)) {
      return NextResponse.json(
        {
          success: true,
          data: {
            orchestrationId: existing.id,
            status: existing.status,
            currentPhase: existing.currentPhase,
          },
          message: 'Orquestração já em andamento',
        },
        { status: 200 }
      )
    }

    // Dispara orquestração em background (fire-and-forget)
    // NÃO await — retorna o response HTTP imediatamente
    ;(async () => {
      try {
        const { maestroOrchestrator } = await import('@/lib/agents/maestro-orchestrator')
        const result = await maestroOrchestrator.orchestrate(taskId)
        console.log(`[orchestrate] Orquestração ${result.orchestrationId} criada: ${result.subtasksCreated} subtarefas`)

        if (autoExecute) {
          const { autoProcessor } = await import('@/lib/agents/auto-processor')
          const MAX_TICKS = 50
          for (let i = 0; i < MAX_TICKS; i++) {
            await autoProcessor.tick()
            const orch = await prisma.orchestration.findUnique({
              where: { id: result.orchestrationId },
              select: { status: true },
            })
            if (!orch || ['COMPLETED', 'FAILED'].includes(orch.status)) {
              console.log(`[orchestrate] Finalizada: ${orch?.status}`)
              break
            }
            await maestroOrchestrator.monitorExecution(result.orchestrationId)
            await new Promise(resolve => setTimeout(resolve, 3000))
          }
        }
      } catch (err) {
        console.error(`[orchestrate] Background orchestration failed:`, err)
      }
    })()

    return NextResponse.json(
      {
        success: true,
        data: {
          taskId: task.id,
          status: 'ORCHESTRATING',
        },
        message: 'Orquestração iniciada em background. Acompanhe o progresso na página da tarefa.',
      },
      { status: 202 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('POST /api/orchestrate error:', error)

    const isClientError = message.includes('já existe') || message.includes('já concluída')
    return NextResponse.json(
      { success: false, error: message },
      { status: isClientError ? 409 : 500 }
    )
  }
}

/**
 * GET /api/orchestrate
 *
 * Lista todas as orquestrações com paginação e filtro de status.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') ?? undefined
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100)
    const offset = parseInt(searchParams.get('offset') ?? '0', 10)

    const where = status ? { status: status as never } : {}

    const [orchestrations, total] = await Promise.all([
      prisma.orchestration.findMany({
        where,
        include: {
          parentTask: { select: { id: true, title: true, status: true, priority: true } },
          _count: { select: { subtasks: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.orchestration.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: orchestrations,
      pagination: { total, limit, offset, hasMore: offset + orchestrations.length < total },
    })
  } catch (error) {
    console.error('GET /api/orchestrate error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao listar orquestrações' },
      { status: 500 }
    )
  }
}
