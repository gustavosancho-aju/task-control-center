import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

type RouteParams = { params: Promise<{ id: string }> }

/**
 * GET /api/orchestrate/[id]/logs
 *
 * Retorna a timeline completa de eventos da orquestração:
 * - Logs de execução de cada subtask
 * - Mudanças de status (StatusChange)
 * - Progresso por fase (derivado do plano e das subtasks)
 *
 * Query params:
 *   level     — filtra logs por nível (INFO, WARNING, ERROR, DEBUG)
 *   subtaskId — filtra logs de uma subtask específica
 *   limit     — máximo de entradas por subtask (default 20)
 *   timeline  — se "true" (default), retorna eventos misturados por timestamp
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const levelFilter = searchParams.get('level') ?? undefined
    const subtaskIdFilter = searchParams.get('subtaskId') ?? undefined
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100)
    const asTimeline = searchParams.get('timeline') !== 'false'

    const orchestration = await prisma.orchestration.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        currentPhase: true,
        plan: true,
        createdAt: true,
        updatedAt: true,
        completedAt: true,
        totalSubtasks: true,
        completedSubtasks: true,
        parentTask: { select: { id: true, title: true } },
      },
    })

    if (!orchestration) {
      return NextResponse.json(
        { success: false, error: 'Orquestração não encontrada' },
        { status: 404 }
      )
    }

    // Busca todas as subtasks com suas execuções e logs
    const subtasks = await prisma.task.findMany({
      where: {
        orchestrationId: id,
        ...(subtaskIdFilter ? { id: subtaskIdFilter } : {}),
      },
      include: {
        executions: {
          include: {
            logs: {
              where: levelFilter ? { level: levelFilter as never } : {},
              orderBy: { createdAt: 'asc' },
              take: limit,
            },
            agent: { select: { id: true, name: true, role: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        statusHistory: {
          orderBy: { changedAt: 'asc' },
        },
        dependsOn: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    // Monta fases a partir do plano armazenado
    const plan = orchestration.plan as {
      phases?: Array<{ name: string; subtasks: Array<{ title: string }> }>
    } | null

    const phases = plan?.phases?.map(phase => {
      const phaseTasks = subtasks.filter(task =>
        phase.subtasks.some(s => s.title === task.title)
      )
      const done = phaseTasks.filter(t => t.status === 'DONE').length
      const inProgress = phaseTasks.filter(t => t.status === 'IN_PROGRESS').length

      return {
        name: phase.name,
        totalSubtasks: phaseTasks.length,
        completedSubtasks: done,
        inProgressSubtasks: inProgress,
        progressPercent: phaseTasks.length > 0 ? Math.round((done / phaseTasks.length) * 100) : 0,
        isCompleted: done === phaseTasks.length && phaseTasks.length > 0,
        tasks: phaseTasks.map(t => ({ id: t.id, title: t.title, status: t.status })),
      }
    }) ?? []

    // Monta resumo por subtask
    const subtaskSummaries = subtasks.map(task => {
      const executions = task.executions.map(exec => ({
        id: exec.id,
        status: exec.status,
        progress: exec.progress,
        startedAt: exec.startedAt,
        completedAt: exec.completedAt,
        agent: exec.agent,
        logCount: exec.logs.length,
        logs: exec.logs,
      }))

      const allLogs = task.executions.flatMap(e => e.logs)

      return {
        subtaskId: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        agentName: task.agentName,
        createdAt: task.createdAt,
        completedAt: task.completedAt,
        dependsOn: task.dependsOn,
        statusHistory: task.statusHistory,
        executions,
        logCount: allLogs.length,
        lastLog: allLogs.at(-1) ?? null,
      }
    })

    if (!asTimeline) {
      return NextResponse.json({
        success: true,
        data: {
          orchestration: {
            id: orchestration.id,
            status: orchestration.status,
            currentPhase: orchestration.currentPhase,
            createdAt: orchestration.createdAt,
            completedAt: orchestration.completedAt,
            parentTask: orchestration.parentTask,
            progress: {
              total: orchestration.totalSubtasks,
              completed: orchestration.completedSubtasks,
              percent: orchestration.totalSubtasks > 0
                ? Math.round((orchestration.completedSubtasks / orchestration.totalSubtasks) * 100)
                : 0,
            },
          },
          phases,
          subtasks: subtaskSummaries,
        },
      })
    }

    // Timeline: todos os eventos misturados e ordenados por timestamp
    type TimelineEvent = {
      timestamp: Date
      type: 'ORCHESTRATION_STARTED' | 'ORCHESTRATION_COMPLETED' | 'SUBTASK_STATUS_CHANGE' | 'EXECUTION_LOG'
      subtaskTitle?: string
      subtaskId?: string
      agent?: string
      level?: string
      message: string
      metadata?: Record<string, unknown>
    }

    const timeline: TimelineEvent[] = []

    // Evento: orquestração iniciada
    timeline.push({
      timestamp: orchestration.createdAt,
      type: 'ORCHESTRATION_STARTED',
      message: `Orquestração iniciada para "${orchestration.parentTask?.title}"`,
    })

    // Eventos: mudanças de status das subtasks
    for (const task of subtasks) {
      for (const change of task.statusHistory) {
        timeline.push({
          timestamp: change.changedAt,
          type: 'SUBTASK_STATUS_CHANGE',
          subtaskId: task.id,
          subtaskTitle: task.title,
          message: change.fromStatus
            ? `"${task.title}": ${change.fromStatus} → ${change.toStatus}`
            : `"${task.title}": status inicial ${change.toStatus}`,
          metadata: { fromStatus: change.fromStatus, toStatus: change.toStatus },
        })
      }

      // Eventos: logs de execução
      for (const exec of task.executions) {
        for (const log of exec.logs) {
          timeline.push({
            timestamp: log.createdAt,
            type: 'EXECUTION_LOG',
            subtaskId: task.id,
            subtaskTitle: task.title,
            agent: exec.agent?.name,
            level: log.level,
            message: log.message,
            metadata: log.data ? (log.data as Record<string, unknown>) : undefined,
          })
        }
      }
    }

    // Evento: orquestração concluída
    if (orchestration.completedAt) {
      timeline.push({
        timestamp: orchestration.completedAt,
        type: 'ORCHESTRATION_COMPLETED',
        message: `Orquestração ${orchestration.status === 'COMPLETED' ? 'concluída com sucesso' : `finalizada com status ${orchestration.status}`}`,
      })
    }

    // Ordena por timestamp
    timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

    return NextResponse.json({
      success: true,
      data: {
        orchestration: {
          id: orchestration.id,
          status: orchestration.status,
          currentPhase: orchestration.currentPhase,
          createdAt: orchestration.createdAt,
          completedAt: orchestration.completedAt,
          parentTask: orchestration.parentTask,
          progress: {
            total: orchestration.totalSubtasks,
            completed: orchestration.completedSubtasks,
            percent: orchestration.totalSubtasks > 0
              ? Math.round((orchestration.completedSubtasks / orchestration.totalSubtasks) * 100)
              : 0,
          },
        },
        phases,
        timeline,
        totalEvents: timeline.length,
      },
    })
  } catch (error) {
    console.error('GET /api/orchestrate/[id]/logs error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar logs da orquestração' },
      { status: 500 }
    )
  }
}
