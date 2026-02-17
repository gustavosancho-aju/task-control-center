import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { suggestSubtasks } from '@/lib/ai/task-analyzer'
import { TaskStatus } from '@prisma/client'

type RouteParams = { params: Promise<{ id: string }> }

/**
 * GET /api/tasks/[id]/subtasks — Lista subtarefas com detalhes
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const task = await prisma.task.findUnique({
      where: { id },
      select: { id: true },
    })
    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Tarefa não encontrada' },
        { status: 404 }
      )
    }

    const subtasks = await prisma.task.findMany({
      where: { parentId: id },
      include: {
        agent: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    const total = subtasks.length
    const done = subtasks.filter((s) => s.status === 'DONE').length

    return NextResponse.json({
      success: true,
      data: subtasks,
      total,
      done,
      progress: total > 0 ? Math.round((done / total) * 100) : 0,
    })
  } catch (error) {
    console.error('GET /api/tasks/[id]/subtasks error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar subtarefas' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/tasks/[id]/subtasks — Cria subtarefa manualmente ou via IA
 *
 * Body para criação manual: { title, description?, priority? }
 * Body para IA: { aiSuggest: true, maxSubtasks?, autoCreate? }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))

    const parentTask = await prisma.task.findUnique({
      where: { id },
      include: {
        agent: { select: { id: true, name: true } },
        tags: { select: { id: true } },
      },
    })

    if (!parentTask) {
      return NextResponse.json(
        { success: false, error: 'Tarefa pai não encontrada' },
        { status: 404 }
      )
    }

    // AI suggestion mode
    if (body.aiSuggest) {
      const { maxSubtasks = 5, autoCreate = false } = body

      const suggestions = await suggestSubtasks(
        parentTask.title,
        parentTask.description || undefined
      )

      if (!suggestions) {
        return NextResponse.json(
          { success: false, error: 'Não foi possível gerar sugestões. Tente novamente.' },
          { status: 500 }
        )
      }

      const limitedSuggestions = suggestions.slice(0, maxSubtasks)

      let createdSubtasks = null
      if (autoCreate) {
        createdSubtasks = await Promise.all(
          limitedSuggestions.map((suggestion) =>
            prisma.task.create({
              data: {
                title: suggestion.title,
                description: suggestion.description,
                priority: suggestion.priority,
                status: 'TODO',
                estimatedHours: suggestion.estimatedHours,
                parentId: id,
                agentId: parentTask.agentId,
                agentName: parentTask.agent?.name ?? null,
                dueDate: parentTask.dueDate,
                tags: parentTask.tags.length > 0
                  ? { connect: parentTask.tags.map((t) => ({ id: t.id })) }
                  : undefined,
                statusHistory: {
                  create: {
                    fromStatus: null,
                    toStatus: 'TODO',
                    notes: 'Subtarefa criada automaticamente pela IA',
                  },
                },
              },
              include: {
                agent: { select: { id: true, name: true, role: true } },
              },
            })
          )
        )
      }

      return NextResponse.json({
        success: true,
        data: {
          parentTaskId: id,
          suggestions: limitedSuggestions,
          created: autoCreate,
          subtasks: createdSubtasks,
        },
      })
    }

    // Manual creation mode
    const { title, description, priority } = body

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Título é obrigatório' },
        { status: 400 }
      )
    }

    const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
    const resolvedPriority = validPriorities.includes(priority)
      ? priority
      : parentTask.priority

    const subtask = await prisma.task.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        priority: resolvedPriority,
        status: 'TODO',
        parentId: id,
        agentId: parentTask.agentId,
        agentName: parentTask.agent?.name ?? null,
        dueDate: parentTask.dueDate,
        tags: parentTask.tags.length > 0
          ? { connect: parentTask.tags.map((t) => ({ id: t.id })) }
          : undefined,
        statusHistory: {
          create: {
            fromStatus: null,
            toStatus: 'TODO',
            notes: 'Subtarefa criada manualmente',
          },
        },
      },
      include: {
        agent: { select: { id: true, name: true, role: true } },
      },
    })

    return NextResponse.json({ success: true, data: subtask }, { status: 201 })
  } catch (error) {
    console.error('POST /api/tasks/[id]/subtasks error:', error)

    if (error instanceof Error && error.message.includes('ANTHROPIC_API_KEY')) {
      return NextResponse.json(
        { success: false, error: 'API key da Anthropic não configurada' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Erro ao criar subtarefa' },
      { status: 500 }
    )
  }
}
