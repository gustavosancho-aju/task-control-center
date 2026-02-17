import { NextRequest, NextResponse } from 'next/server'
import { queueManager } from '@/lib/agents/queue-manager'
import prisma from '@/lib/db'
import type { QueueStatus } from '@prisma/client'

export async function GET() {
  try {
    const stats = await queueManager.getQueueStatus()

    const recentItems = await prisma.agentQueue.findMany({
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      take: 20,
    })

    return NextResponse.json({
      success: true,
      data: { stats, items: recentItems },
    })
  } catch (error) {
    console.error('GET /api/queue error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao buscar status da fila' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { taskId, agentId, priority, scheduledFor, maxAttempts } = body

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

    const existing = await prisma.agentQueue.findUnique({ where: { taskId } })
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Tarefa já está na fila' },
        { status: 409 }
      )
    }

    const entry = await queueManager.addToQueue(taskId, agentId, {
      priority,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
      maxAttempts,
    })

    return NextResponse.json({ success: true, data: entry }, { status: 201 })
  } catch (error) {
    console.error('POST /api/queue error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao adicionar na fila' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as QueueStatus | null

    const count = await queueManager.clearQueue(status || undefined)

    return NextResponse.json({
      success: true,
      data: { removed: count },
      message: status ? `Fila limpa (status: ${status})` : 'Fila completamente limpa',
    })
  } catch (error) {
    console.error('DELETE /api/queue error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao limpar fila' }, { status: 500 })
  }
}
