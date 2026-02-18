import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { maestroOrchestrator } from '@/lib/agents/maestro-orchestrator'

/**
 * POST /api/orchestrate
 *
 * Inicia a orquestração de uma tarefa via MaestroOrchestrator.
 * O Maestro decompõe a tarefa em subtarefas, atribui agentes e
 * enfileira a execução respeitando dependências.
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

    // Inicia orquestração (pode demorar — chama Claude)
    const result = await maestroOrchestrator.orchestrate(taskId)

    // Aciona o AutoProcessor para processar a fila imediatamente (se solicitado)
    // Usa um loop contínuo que processa todas as subtasks conforme dependências são liberadas
    if (autoExecute) {
      const { autoProcessor } = await import('@/lib/agents/auto-processor')
      const orchestrationId = result.orchestrationId
      // Fire-and-forget: loop que processa tick + monitora até orquestração completar
      ;(async () => {
        const MAX_TICKS = 50 // Segurança: máximo de ciclos
        for (let i = 0; i < MAX_TICKS; i++) {
          try {
            await autoProcessor.tick()

            // Verifica se orquestração terminou
            const orch = await prisma.orchestration.findUnique({
              where: { id: orchestrationId },
              select: { status: true },
            })
            if (!orch || ['COMPLETED', 'FAILED'].includes(orch.status)) {
              console.log(`[orchestrate] Orquestração ${orchestrationId} finalizada (${orch?.status})`)
              break
            }

            // Monitora e re-enfileira tasks prontas
            await maestroOrchestrator.monitorExecution(orchestrationId)

            // Aguarda antes do próximo ciclo para dar tempo às execuções
            await new Promise(resolve => setTimeout(resolve, 3000))
          } catch (err) {
            console.warn(`[orchestrate] Tick ${i} error:`, err)
            break
          }
        }
      })().catch((err: unknown) =>
        console.warn('[orchestrate] Processing loop error:', err)
      )
    }

    // Busca o estado atualizado da orquestração para retornar
    const orchestration = await prisma.orchestration.findUnique({
      where: { id: result.orchestrationId },
      include: {
        subtasks: {
          select: {
            id: true, title: true, status: true, priority: true,
            agentId: true, agentName: true, estimatedHours: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          orchestrationId: result.orchestrationId,
          status: orchestration?.status,
          totalSubtasks: result.subtasksCreated,
          currentPhase: orchestration?.currentPhase,
          plan: result.plan,
          subtasks: orchestration?.subtasks ?? [],
        },
        message: `Orquestração iniciada: ${result.subtasksCreated} subtarefas criadas`,
      },
      { status: 201 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('POST /api/orchestrate error:', error)

    // Erros de negócio (orquestração já existe, tarefa já concluída)
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
