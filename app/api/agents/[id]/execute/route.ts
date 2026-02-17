import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { queueManager } from '@/lib/agents/queue-manager'
import { executionEngine } from '@/lib/agents/execution-engine'
import { registerAllCapabilities } from '@/lib/agents/capabilities'

type RouteParams = { params: Promise<{ id: string }> }

let capabilitiesRegistered = false

function ensureCapabilities() {
  if (!capabilitiesRegistered) {
    registerAllCapabilities()
    capabilitiesRegistered = true
  }
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id: agentId } = await params

    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { id: true, name: true, role: true, isActive: true },
    })

    if (!agent) {
      return NextResponse.json({ success: false, error: 'Agente não encontrado' }, { status: 404 })
    }
    if (!agent.isActive) {
      return NextResponse.json({ success: false, error: 'Agente está inativo' }, { status: 400 })
    }

    const nextItem = await queueManager.getNextInQueue(agentId)

    if (!nextItem) {
      return NextResponse.json({
        success: true,
        data: null,
        message: 'Nenhuma tarefa na fila para este agente',
      })
    }

    // Mark as processing in queue
    await prisma.agentQueue.update({
      where: { id: nextItem.id },
      data: { status: 'PROCESSING', attempts: { increment: 1 } },
    })

    ensureCapabilities()

    try {
      const result = await executionEngine.executeTask(nextItem.taskId, agentId)

      await prisma.agentQueue.update({
        where: { id: nextItem.id },
        data: { status: result.success ? 'COMPLETED' : 'FAILED' },
      })

      const execution = await prisma.agentExecution.findFirst({
        where: { taskId: nextItem.taskId, agentId },
        include: {
          task: { select: { id: true, title: true, status: true } },
          agent: { select: { id: true, name: true, role: true } },
          logs: { orderBy: { createdAt: 'desc' }, take: 10 },
        },
        orderBy: { createdAt: 'desc' },
      })

      return NextResponse.json({
        success: true,
        data: { execution, result },
      })
    } catch (error) {
      const attempts = nextItem.attempts + 1
      const exhausted = attempts >= nextItem.maxAttempts

      await prisma.agentQueue.update({
        where: { id: nextItem.id },
        data: { status: exhausted ? 'FAILED' : 'PENDING' },
      })

      throw error
    }
  } catch (error) {
    console.error('POST /api/agents/[id]/execute error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao executar tarefa do agente' },
      { status: 500 }
    )
  }
}
