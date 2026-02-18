import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { maestroOrchestrator } from '@/lib/agents/maestro-orchestrator'

type RouteParams = { params: Promise<{ id: string }> }

/**
 * GET /api/orchestrate/[id]
 *
 * Retorna o status completo da orquestração com subtasks e progresso.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const orchestration = await prisma.orchestration.findUnique({
      where: { id },
      include: {
        parentTask: {
          select: { id: true, title: true, status: true, priority: true, description: true },
        },
        subtasks: {
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            priority: true,
            agentId: true,
            agentName: true,
            estimatedHours: true,
            actualHours: true,
            createdAt: true,
            completedAt: true,
            dependsOn: { select: { id: true, title: true, status: true } },
            dependents: { select: { id: true, title: true, status: true } },
            executions: {
              select: { id: true, status: true, progress: true, startedAt: true, completedAt: true },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!orchestration) {
      return NextResponse.json(
        { success: false, error: 'Orquestração não encontrada' },
        { status: 404 }
      )
    }

    // Calcula progresso percentual
    const total = orchestration.subtasks.length
    const done = orchestration.subtasks.filter(t => t.status === 'DONE').length
    const inProgress = orchestration.subtasks.filter(t => t.status === 'IN_PROGRESS').length
    const progressPercent = total > 0 ? Math.round((done / total) * 100) : 0

    // Identifica quais subtasks estão bloqueadas (têm deps pendentes)
    const subtasksWithBlockedInfo = orchestration.subtasks.map(task => ({
      ...task,
      isBlocked: task.dependsOn.some(dep => dep.status !== 'DONE'),
      isReady: task.status === 'TODO' && task.dependsOn.every(dep => dep.status === 'DONE'),
    }))

    return NextResponse.json({
      success: true,
      data: {
        ...orchestration,
        subtasks: subtasksWithBlockedInfo,
        progress: {
          percent: progressPercent,
          done,
          inProgress,
          total,
          remaining: total - done,
        },
      },
    })
  } catch (error) {
    console.error('GET /api/orchestrate/[id] error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar orquestração' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/orchestrate/[id]
 *
 * Controla o ciclo de vida da orquestração.
 *
 * Actions:
 *   monitor   — executa um ciclo de monitoramento (desbloqueia deps, verifica conclusão)
 *   pause     — pausa subtasks em andamento (cancela execuções RUNNING)
 *   resume    — retoma subtasks pausadas
 *   cancel    — cancela toda a orquestração
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const { action } = body as { action: 'monitor' | 'pause' | 'resume' | 'cancel' }

    const orchestration = await prisma.orchestration.findUnique({
      where: { id },
      select: { id: true, status: true, parentTaskId: true },
    })

    if (!orchestration) {
      return NextResponse.json(
        { success: false, error: 'Orquestração não encontrada' },
        { status: 404 }
      )
    }

    switch (action) {
      case 'monitor': {
        await maestroOrchestrator.monitorExecution(id)
        const updated = await prisma.orchestration.findUnique({
          where: { id },
          select: { status: true, currentPhase: true, completedSubtasks: true, totalSubtasks: true },
        })
        return NextResponse.json({
          success: true,
          message: 'Ciclo de monitoramento executado',
          data: updated,
        })
      }

      case 'pause': {
        if (['COMPLETED', 'FAILED'].includes(orchestration.status)) {
          return NextResponse.json(
            { success: false, error: `Não é possível pausar orquestração com status ${orchestration.status}` },
            { status: 400 }
          )
        }

        // Cancela execuções RUNNING das subtasks
        const runningExecutions = await prisma.agentExecution.findMany({
          where: {
            task: { orchestrationId: id },
            status: 'RUNNING',
          },
          select: { id: true },
        })

        await Promise.all(
          runningExecutions.map(exec =>
            prisma.agentExecution.update({
              where: { id: exec.id },
              data: { status: 'PAUSED' },
            })
          )
        )

        // Remove subtasks da fila
        const subtaskIds = await prisma.task.findMany({
          where: { orchestrationId: id },
          select: { id: true },
        })
        await prisma.agentQueue.deleteMany({
          where: { taskId: { in: subtaskIds.map(t => t.id) }, status: 'PENDING' },
        })

        await prisma.orchestration.update({
          where: { id },
          data: { currentPhase: 'Pausada pelo usuário' },
        })

        return NextResponse.json({
          success: true,
          message: 'Orquestração pausada',
          data: { pausedExecutions: runningExecutions.length },
        })
      }

      case 'resume': {
        // Re-enfileira subtasks que estavam PENDING ou cujas deps já foram concluídas
        const subtasks = await prisma.task.findMany({
          where: { orchestrationId: id, status: { in: ['TODO', 'IN_PROGRESS'] } },
          include: { dependsOn: { select: { id: true, status: true } } },
        })

        await maestroOrchestrator.queueForExecution(id, subtasks)

        await prisma.orchestration.update({
          where: { id },
          data: { status: 'EXECUTING', currentPhase: 'Retomada pelo usuário' },
        })

        return NextResponse.json({
          success: true,
          message: 'Orquestração retomada',
        })
      }

      case 'cancel': {
        const subtaskIds = await prisma.task.findMany({
          where: { orchestrationId: id },
          select: { id: true },
        })

        // Remove da fila e cancela execuções ativas
        await Promise.all([
          prisma.agentQueue.deleteMany({
            where: { taskId: { in: subtaskIds.map(t => t.id) } },
          }),
          prisma.agentExecution.updateMany({
            where: {
              taskId: { in: subtaskIds.map(t => t.id) },
              status: { in: ['RUNNING', 'QUEUED'] },
            },
            data: { status: 'CANCELLED', completedAt: new Date() },
          }),
          prisma.orchestration.update({
            where: { id },
            data: {
              status: 'FAILED',
              currentPhase: 'Cancelada pelo usuário',
              completedAt: new Date(),
            },
          }),
        ])

        return NextResponse.json({
          success: true,
          message: 'Orquestração cancelada',
        })
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Ação inválida. Use: monitor, pause, resume, cancel' },
          { status: 400 }
        )
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('PATCH /api/orchestrate/[id] error:', error)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

/**
 * DELETE /api/orchestrate/[id]
 *
 * Cancela e remove completamente a orquestração (incluindo subtasks autoCreated).
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const orchestration = await prisma.orchestration.findUnique({
      where: { id },
      select: { id: true, status: true },
    })

    if (!orchestration) {
      return NextResponse.json(
        { success: false, error: 'Orquestração não encontrada' },
        { status: 404 }
      )
    }

    if (orchestration.status === 'EXECUTING') {
      return NextResponse.json(
        { success: false, error: 'Cancele a orquestração antes de excluir (PATCH action=cancel)' },
        { status: 400 }
      )
    }

    // Remove subtasks autoCreated (em cascata via Prisma)
    const deleted = await prisma.task.deleteMany({
      where: { orchestrationId: id, autoCreated: true },
    })

    // Remove a orquestração (parentTask permanece intacta)
    await prisma.orchestration.delete({ where: { id } })

    return NextResponse.json({
      success: true,
      message: `Orquestração removida (${deleted.count} subtarefas excluídas)`,
    })
  } catch (error) {
    console.error('DELETE /api/orchestrate/[id] error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao remover orquestração' },
      { status: 500 }
    )
  }
}
