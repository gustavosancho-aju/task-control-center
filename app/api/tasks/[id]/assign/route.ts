import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { AssignAgentSchema } from '@/lib/utils/validators'

type RouteParams = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const data = AssignAgentSchema.parse(body)

    const task = await prisma.task.findUnique({ where: { id }, select: { id: true, agentId: true } })
    if (!task) {
      return NextResponse.json({ success: false, error: 'Tarefa nao encontrada' }, { status: 404 })
    }

    const agent = await prisma.agent.findUnique({
      where: { id: data.agentId },
      select: { id: true, name: true, isActive: true },
    })
    if (!agent) {
      return NextResponse.json({ success: false, error: 'Agente nao encontrado' }, { status: 404 })
    }
    if (!agent.isActive) {
      return NextResponse.json({ success: false, error: 'Agente esta inativo' }, { status: 400 })
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: { agentId: data.agentId, agentName: agent.name },
      include: { agent: true },
    })

    await prisma.statusChange.create({
      data: {
        taskId: id,
        fromStatus: updatedTask.status,
        toStatus: updatedTask.status,
        notes: `Tarefa atribuida ao agente ${agent.name}`,
      },
    })

    return NextResponse.json({ success: true, data: updatedTask, message: `Tarefa atribuida ao agente ${agent.name}` })
  } catch (error) {
    console.error('POST /api/tasks/[id]/assign error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao atribuir agente' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const task = await prisma.task.findUnique({ where: { id }, select: { id: true, agentName: true } })
    if (!task) {
      return NextResponse.json({ success: false, error: 'Tarefa nao encontrada' }, { status: 404 })
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: { agentId: null, agentName: null },
    })

    if (task.agentName) {
      await prisma.statusChange.create({
        data: {
          taskId: id,
          fromStatus: updatedTask.status,
          toStatus: updatedTask.status,
          notes: `Agente ${task.agentName} removido da tarefa`,
        },
      })
    }

    return NextResponse.json({ success: true, data: updatedTask, message: 'Agente removido da tarefa' })
  } catch (error) {
    console.error('DELETE /api/tasks/[id]/assign error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao remover agente' }, { status: 500 })
  }
}
