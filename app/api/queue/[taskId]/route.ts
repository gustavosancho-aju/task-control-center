import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { queueManager } from '@/lib/agents/queue-manager'

type RouteParams = { params: Promise<{ taskId: string }> }

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { taskId } = await params

    const entry = await prisma.agentQueue.findUnique({
      where: { taskId },
    })

    if (!entry) {
      return NextResponse.json({ success: false, error: 'Tarefa não encontrada na fila' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: entry })
  } catch (error) {
    console.error('GET /api/queue/[taskId] error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao buscar tarefa na fila' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { taskId } = await params

    const entry = await prisma.agentQueue.findUnique({
      where: { taskId },
      select: { id: true, status: true },
    })

    if (!entry) {
      return NextResponse.json({ success: false, error: 'Tarefa não encontrada na fila' }, { status: 404 })
    }

    if (entry.status === 'PROCESSING') {
      return NextResponse.json(
        { success: false, error: 'Não é possível remover tarefa em processamento' },
        { status: 400 }
      )
    }

    await queueManager.removeFromQueue(taskId)

    return NextResponse.json({ success: true, message: 'Tarefa removida da fila' })
  } catch (error) {
    console.error('DELETE /api/queue/[taskId] error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao remover da fila' }, { status: 500 })
  }
}
