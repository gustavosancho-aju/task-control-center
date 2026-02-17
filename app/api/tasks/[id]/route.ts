import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { UpdateTaskSchema } from '@/lib/utils/validators'
import { TaskStatus } from '@prisma/client'
import { logTaskUpdate, logTaskDelete, logStatusChange, logTaskComplete } from '@/lib/audit/logger'
import { cache } from '@/lib/cache'

type RouteParams = { params: Promise<{ id: string }> }

const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  TODO: ['IN_PROGRESS', 'BLOCKED', 'DONE'],
  IN_PROGRESS: ['REVIEW', 'BLOCKED', 'TODO', 'DONE'],
  REVIEW: ['DONE', 'IN_PROGRESS', 'BLOCKED'],
  DONE: ['TODO'],
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

      // Business rule: parent task can only be DONE if all subtasks are DONE
      if (data.status === 'DONE') {
        const pendingSubtasks = await prisma.task.count({
          where: { parentId: id, status: { not: 'DONE' } },
        })
        if (pendingSubtasks > 0) {
          return NextResponse.json({
            success: false,
            error: `Não é possível concluir: ${pendingSubtasks} subtarefa${pendingSubtasks > 1 ? 's' : ''} ainda não concluída${pendingSubtasks > 1 ? 's' : ''}`,
          }, { status: 400 })
        }
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
      include: { agent: true, statusHistory: { orderBy: { changedAt: 'desc' }, take: 20 } },
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

      logStatusChange(id, currentTask.status, data.status)

      if (data.status === 'DONE') {
        logTaskComplete(id, task.title)
      }
    }

    // Log non-status field changes
    const fieldChanges: Record<string, { from: unknown; to: unknown }> = {}
    if (data.title && data.title !== task.title) fieldChanges.title = { from: task.title, to: data.title }
    if (data.priority) fieldChanges.priority = { from: currentTask.status, to: data.priority }
    if (data.description !== undefined) fieldChanges.description = { from: "...", to: "..." }
    if (Object.keys(fieldChanges).length > 0 && !data.status) {
      logTaskUpdate(id, fieldChanges)
    }

    cache.invalidatePattern('tasks:*')

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

    // Get task title before deletion for audit
    const taskDetails = await prisma.task.findUnique({ where: { id }, select: { title: true } })

    // Delete subtasks first (cascade)
    await prisma.task.deleteMany({ where: { parentId: id } })

    await prisma.task.delete({ where: { id } })

    logTaskDelete(id, taskDetails?.title || "")
    cache.invalidatePattern('tasks:*')

    return NextResponse.json({ success: true, message: 'Tarefa deletada com sucesso' })
  } catch (error) {
    console.error('DELETE /api/tasks/[id] error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao deletar tarefa' }, { status: 500 })
  }
}
