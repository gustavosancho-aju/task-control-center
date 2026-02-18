import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

type RouteParams = { params: Promise<{ id: string }> }

/**
 * GET /api/orchestrate/[id]/subtasks
 *
 * Lista todas as subtasks da orquestração em ordem de execução.
 * Inclui status, agente, dependências e última execução.
 *
 * Query params:
 *   status  — filtra por status (TODO, IN_PROGRESS, DONE, BLOCKED)
 *   ready   — se "true", retorna apenas tarefas prontas para execução
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status') ?? undefined
    const onlyReady = searchParams.get('ready') === 'true'

    const orchestration = await prisma.orchestration.findUnique({
      where: { id },
      select: { id: true, status: true, totalSubtasks: true, completedSubtasks: true },
    })

    if (!orchestration) {
      return NextResponse.json(
        { success: false, error: 'Orquestração não encontrada' },
        { status: 404 }
      )
    }

    const subtasks = await prisma.task.findMany({
      where: {
        orchestrationId: id,
        ...(statusFilter ? { status: statusFilter as never } : {}),
      },
      include: {
        dependsOn: { select: { id: true, title: true, status: true } },
        dependents: { select: { id: true, title: true, status: true } },
        agent: { select: { id: true, name: true, role: true } },
        executions: {
          select: {
            id: true,
            status: true,
            progress: true,
            startedAt: true,
            completedAt: true,
            error: true,
            _count: { select: { logs: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    // Enriquece com campos computados
    const enriched = subtasks.map(task => {
      const pendingDeps = task.dependsOn.filter(dep => dep.status !== 'DONE')
      const isBlocked = pendingDeps.length > 0
      const isReady = task.status === 'TODO' && !isBlocked
      const execution = task.executions[0] ?? null

      return {
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        estimatedHours: task.estimatedHours,
        actualHours: task.actualHours,
        autoCreated: task.autoCreated,
        createdAt: task.createdAt,
        completedAt: task.completedAt,

        // Agente
        agent: task.agent,
        agentName: task.agentName,

        // Dependências
        dependsOn: task.dependsOn,
        dependents: task.dependents,
        isBlocked,
        isReady,
        pendingDepsCount: pendingDeps.length,
        blockedBy: pendingDeps.map(d => d.title),

        // Execução atual
        execution,
        progress: execution?.progress ?? 0,
      }
    })

    // Filtra apenas prontas, se solicitado
    const result = onlyReady ? enriched.filter(t => t.isReady) : enriched

    // Ordena respeitando dependências (topological order para exibição)
    const ordered = topologicalSort(result)

    // Estatísticas por status
    const stats = {
      total: enriched.length,
      todo: enriched.filter(t => t.status === 'TODO' && !t.isBlocked).length,
      blocked: enriched.filter(t => t.status === 'TODO' && t.isBlocked).length,
      inProgress: enriched.filter(t => t.status === 'IN_PROGRESS').length,
      done: enriched.filter(t => t.status === 'DONE').length,
      ready: enriched.filter(t => t.isReady).length,
    }

    return NextResponse.json({
      success: true,
      data: ordered,
      orchestration: {
        id: orchestration.id,
        status: orchestration.status,
        totalSubtasks: orchestration.totalSubtasks,
        completedSubtasks: orchestration.completedSubtasks,
      },
      stats,
    })
  } catch (error) {
    console.error('GET /api/orchestrate/[id]/subtasks error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar subtasks' },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// Topological sort para exibição (tarefas sem deps primeiro)
// ---------------------------------------------------------------------------

type TaskItem = { id: string; dependsOn: { id: string }[] }

function topologicalSort<T extends TaskItem>(tasks: T[]): T[] {
  const idToTask = new Map(tasks.map(t => [t.id, t]))
  const visited = new Set<string>()
  const result: T[] = []

  function visit(task: T) {
    if (visited.has(task.id)) return
    visited.add(task.id)
    for (const dep of task.dependsOn) {
      const depTask = idToTask.get(dep.id)
      if (depTask) visit(depTask)
    }
    result.push(task)
  }

  for (const task of tasks) {
    visit(task)
  }

  return result
}
