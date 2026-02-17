import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { executionEngine } from '@/lib/agents/execution-engine'
import { registerAllCapabilities } from '@/lib/agents/capabilities'
import type { ExecutionStatus } from '@prisma/client'
import { logExecutionAction } from '@/lib/audit/logger'

let capabilitiesRegistered = false

function ensureCapabilities() {
  if (!capabilitiesRegistered) {
    registerAllCapabilities()
    capabilitiesRegistered = true
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('taskId') || undefined
    const agentId = searchParams.get('agentId') || undefined
    const status = searchParams.get('status') as ExecutionStatus | undefined
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const where: Record<string, unknown> = {}
    if (taskId) where.taskId = taskId
    if (agentId) where.agentId = agentId
    if (status) where.status = status

    const [executions, total] = await Promise.all([
      prisma.agentExecution.findMany({
        where,
        select: {
          id: true,
          taskId: true,
          agentId: true,
          status: true,
          startedAt: true,
          completedAt: true,
          progress: true,
          createdAt: true,
          updatedAt: true,
          task: { select: { id: true, title: true, status: true, priority: true } },
          agent: { select: { id: true, name: true, role: true } },
          _count: { select: { logs: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.agentExecution.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: executions,
      pagination: { total, limit, offset, hasMore: offset + executions.length < total },
    })
  } catch (error) {
    console.error('GET /api/executions error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao buscar execuções' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { taskId, agentId, manual } = body as {
      taskId: string
      agentId: string
      manual?: boolean  // true = agente externo, cria com RUNNING sem acionar o engine
    }

    if (!taskId || !agentId) {
      return NextResponse.json(
        { success: false, error: 'taskId e agentId são obrigatórios' },
        { status: 400 }
      )
    }

    const [task, agent] = await Promise.all([
      prisma.task.findUnique({ where: { id: taskId }, select: { id: true } }),
      prisma.agent.findUnique({ where: { id: agentId }, select: { id: true, isActive: true } }),
    ])

    if (!task) {
      return NextResponse.json({ success: false, error: 'Tarefa não encontrada' }, { status: 404 })
    }
    if (!agent) {
      return NextResponse.json({ success: false, error: 'Agente não encontrado' }, { status: 404 })
    }
    if (!agent.isActive) {
      return NextResponse.json({ success: false, error: 'Agente está inativo' }, { status: 400 })
    }

    // Modo manual: cria execução com RUNNING diretamente (agente externo controla o ciclo)
    if (manual) {
      const execution = await prisma.agentExecution.create({
        data: {
          taskId,
          agentId,
          status: 'RUNNING',
          startedAt: new Date(),
          progress: 0,
        },
        include: {
          task: { select: { id: true, title: true, status: true } },
          agent: { select: { id: true, name: true, role: true } },
        },
      })

      logExecutionAction(execution.id, "EXECUTE", {
        taskId: { from: null, to: taskId },
        agentId: { from: null, to: agentId },
        status: { from: null, to: 'RUNNING' },
      })

      return NextResponse.json({ success: true, data: { execution } }, { status: 201 })
    }

    // Modo engine: executa imediatamente via executionEngine
    ensureCapabilities()

    const result = await executionEngine.executeTask(taskId, agentId)

    const execution = await prisma.agentExecution.findFirst({
      where: { taskId, agentId },
      include: {
        task: { select: { id: true, title: true, status: true } },
        agent: { select: { id: true, name: true, role: true } },
        logs: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (execution) {
      logExecutionAction(execution.id, "EXECUTE", {
        taskId: { from: null, to: taskId },
        agentId: { from: null, to: agentId },
        status: { from: null, to: execution.status },
      })
    }

    return NextResponse.json({
      success: true,
      data: { execution, result },
    }, { status: 201 })
  } catch (error) {
    console.error('POST /api/executions error:', error)
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { success: false, error: message || 'Erro ao iniciar execução' },
      { status: 500 }
    )
  }
}
