import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { UpdateTaskSchema } from '@/lib/utils/validators'
import { TaskStatus } from '@prisma/client'

type RouteParams = { params: Promise<{ id: string }> }

const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  TODO: ['IN_PROGRESS', 'BLOCKED'],
  IN_PROGRESS: ['REVIEW', 'BLOCKED', 'TODO'],
  REVIEW: ['DONE', 'IN_PROGRESS', 'BLOCKED'],
  DONE: [],
  BLOCKED: ['TODO', 'IN_PROGRESS'],
}

function isValidTransition(from: TaskStatus, to: TaskStatus): boolean {
  if (from === to) return true
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        agent: true,
        parent: { select: { id: true, title: true, status: true } },
        subtasks: { select: { id: true, title: true, status: true, priority: true } },
        statusHistory: { orderBy: { changedAt: 'desc' }, take: 20 },
      },
    })
    if (!task) {
      return NextResponse.json({ success: false, error: 'Tarefa nao encontrada' }, { status: 404 })
    }
    return NextResponse.json({ success: true, data: task })
  } catch (error) {
    console.error('GET /api/tasks/[id] error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao buscar tarefa' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const data = UpdateTaskSchema.parse(body)

    const currentTask = await prisma.task.findUnique({
      where: { id },
      select: { status: true },
    })
    if (!currentTask) {
      return NextResponse.json({ success: false, error: 'Tarefa nao encontrada' }, { status: 404 })
    }

    if (data.status && data.status !== currentTask.status) {
      if (!isValidTransition(currentTask.status, data.status as TaskStatus)) {
        return NextResponse.json({
          success: false,
          error: `Transicao invalida: ${currentTask.status} -> ${data.status}`,
          allowedTransitions: VALID_TRANSITIONS[currentTask.status],
        }, { status: 400 })
      }
    }

    const updateData: any = { ...data }
    if (data.dueDate) updateData.dueDate = new Date(data.dueDate)
    if (data.status === 'DONE' && currentTask.status !== 'DONE') {
      updateData.completedAt = new Date()
    }

    const task = await prisma.task.update({
      where: { id },
      data: updateData,
      include: { agent: true, statusHistory: { orderBy: { changedAt: 'desc' }, take: 5 } },
    })

    if (data.status && data.status !== currentTask.status) {
      await prisma.statusChange.create({
        data: {
          taskId: id,
          fromStatus: currentTask.status,
          toStatus: data.status as TaskStatus,
          notes: `Status alterado de ${currentTask.status} para ${data.status}`,
        },
      })
    }

    return NextResponse.json({ success: true, data: task })
  } catch (error) {
    console.error('PATCH /api/tasks/[id] error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao atualizar tarefa' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const task = await prisma.task.findUnique({ where: { id }, select: { id: true } })
    if (!task) {
      return NextResponse.json({ success: false, error: 'Tarefa nao encontrada' }, { status: 404 })
    }
    await prisma.task.delete({ where: { id } })
    return NextResponse.json({ success: true, message: 'Tarefa deletada com sucesso' })
  } catch (error) {
    console.error('DELETE /api/tasks/[id] error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao deletar tarefa' }, { status: 500 })
  }
}
