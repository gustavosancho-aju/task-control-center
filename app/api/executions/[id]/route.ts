import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { executionEngine } from '@/lib/agents/execution-engine'
import { registerAllCapabilities } from '@/lib/agents/capabilities'
import { logExecutionAction } from '@/lib/audit/logger'

type RouteParams = { params: Promise<{ id: string }> }

let capabilitiesRegistered = false

function ensureCapabilities() {
  if (!capabilitiesRegistered) {
    registerAllCapabilities()
    capabilitiesRegistered = true
  }
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const execution = await prisma.agentExecution.findUnique({
      where: { id },
      include: {
        task: true,
        agent: true,
        logs: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    })

    if (!execution) {
      return NextResponse.json({ success: false, error: 'Execução não encontrada' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: execution })
  } catch (error) {
    console.error('GET /api/executions/[id] error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao buscar execução' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const { action, status, progress } = body as {
      action?: 'pause' | 'resume' | 'cancel'
      status?: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
      progress?: number
    }

    // Modo manual: atualiza status/progress diretamente no banco (agentes externos)
    if (!action && (status || progress !== undefined)) {
      const updateData: Record<string, unknown> = { updatedAt: new Date() }
      if (status) updateData.status = status
      if (progress !== undefined) updateData.progress = Math.min(100, Math.max(0, progress))
      if (status === 'RUNNING' && !updateData.startedAt) updateData.startedAt = new Date()
      if (status === 'COMPLETED' || status === 'FAILED' || status === 'CANCELLED') {
        updateData.completedAt = new Date()
        if (progress === undefined) updateData.progress = status === 'COMPLETED' ? 100 : updateData.progress
      }

      const execution = await prisma.agentExecution.update({
        where: { id },
        data: updateData,
        include: {
          task: { select: { id: true, title: true, status: true } },
          agent: { select: { id: true, name: true, role: true } },
        },
      })

      logExecutionAction(id, "UPDATE", { status: { from: null, to: status ?? 'updated' } })

      return NextResponse.json({ success: true, data: execution })
    }

    // Modo engine: ações pause/resume/cancel
    if (!action || !['pause', 'resume', 'cancel'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Forneça action (pause|resume|cancel) ou status/progress para atualização manual' },
        { status: 400 }
      )
    }

    ensureCapabilities()

    let result = null

    switch (action) {
      case 'pause':
        await executionEngine.pauseExecution(id)
        break
      case 'resume':
        result = await executionEngine.resumeExecution(id)
        break
      case 'cancel':
        await executionEngine.cancelExecution(id)
        break
    }

    const execution = await prisma.agentExecution.findUnique({
      where: { id },
      include: {
        task: { select: { id: true, title: true, status: true } },
        agent: { select: { id: true, name: true, role: true } },
        logs: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    })

    const actionLabel = action === 'pause' ? 'PAUSED' : action === 'resume' ? 'RUNNING' : 'CANCELLED'
    logExecutionAction(id, "UPDATE", {
      action: { from: null, to: action },
      status: { from: null, to: actionLabel },
    })

    return NextResponse.json({
      success: true,
      data: { execution, result },
      message: `Execução ${action === 'pause' ? 'pausada' : action === 'resume' ? 'retomada' : 'cancelada'} com sucesso`,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro ao atualizar execução'
    console.error('PATCH /api/executions/[id] error:', error)
    return NextResponse.json({ success: false, error: msg }, { status: 400 })
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const execution = await prisma.agentExecution.findUnique({
      where: { id },
      select: { id: true, status: true },
    })

    if (!execution) {
      return NextResponse.json({ success: false, error: 'Execução não encontrada' }, { status: 404 })
    }

    if (execution.status === 'RUNNING') {
      return NextResponse.json(
        { success: false, error: 'Não é possível remover execução em andamento. Cancele primeiro.' },
        { status: 400 }
      )
    }

    await prisma.agentExecution.delete({ where: { id } })

    return NextResponse.json({ success: true, message: 'Execução removida com sucesso' })
  } catch (error) {
    console.error('DELETE /api/executions/[id] error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao remover execução' }, { status: 500 })
  }
}
