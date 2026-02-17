import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import type { TaskPriority } from '@prisma/client'

type RouteParams = { params: Promise<{ id: string }> }

/**
 * POST /api/templates/[id]/use — Cria tarefa a partir do template
 *
 * Body (opcional): { title?, description?, priority?, agentId? }
 * Campos fornecidos no body sobrescrevem os defaults do template.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const template = await prisma.taskTemplate.findUnique({
      where: { id },
    })
    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Template não encontrado' },
        { status: 404 }
      )
    }
    if (!template.isActive) {
      return NextResponse.json(
        { success: false, error: 'Template está desativado' },
        { status: 400 }
      )
    }

    let body: Record<string, unknown> = {}
    try {
      body = await request.json()
    } catch {
      // Body vazio é permitido
    }

    // Resolve agent by role if not provided
    let agentId: string | null = (body.agentId as string) || null
    let agentName: string | null = null

    if (!agentId && template.defaultAgentRole) {
      const agent = await prisma.agent.findFirst({
        where: { role: template.defaultAgentRole, isActive: true },
      })
      if (agent) {
        agentId = agent.id
        agentName = agent.name
      }
    }

    if (agentId && !agentName) {
      const agent = await prisma.agent.findUnique({ where: { id: agentId } })
      if (agent) agentName = agent.name
    }

    // Resolve tags
    const tagNames = template.defaultTags
    let tagConnect: { id: string }[] = []
    if (tagNames.length > 0) {
      const tags = await prisma.tag.findMany({
        where: { name: { in: tagNames } },
        select: { id: true },
      })
      tagConnect = tags.map((t) => ({ id: t.id }))
    }

    // Resolve priority
    const validPriorities: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
    const rawPriority = (body.priority as string) || template.defaultPriority
    const priority: TaskPriority = validPriorities.includes(rawPriority as TaskPriority)
      ? (rawPriority as TaskPriority)
      : template.defaultPriority

    // Create task
    const task = await prisma.task.create({
      data: {
        title: (body.title as string)?.trim() || template.defaultTitle,
        description: (body.description as string)?.trim() || template.defaultDescription,
        priority,
        agentId,
        agentName,
        tags: tagConnect.length > 0 ? { connect: tagConnect } : undefined,
      },
      include: {
        agent: { select: { id: true, name: true, role: true } },
        tags: true,
      },
    })

    // Create subtasks if template defines them
    const subtaskTemplates = template.subtaskTemplates as
      | { title: string; description?: string; priority?: string }[]
      | null

    const createdSubtasks: { id: string; title: string }[] = []
    if (Array.isArray(subtaskTemplates) && subtaskTemplates.length > 0) {
      for (const st of subtaskTemplates) {
        const subtask = await prisma.task.create({
          data: {
            title: st.title,
            description: st.description || null,
            priority: (validPriorities.includes(st.priority as TaskPriority) ? st.priority as TaskPriority : template.defaultPriority),
            parentId: task.id,
            agentId,
            agentName,
          },
        })
        createdSubtasks.push({ id: subtask.id, title: subtask.title })
      }
    }

    // Increment usage count
    await prisma.taskTemplate.update({
      where: { id },
      data: { usageCount: { increment: 1 } },
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          task,
          subtasks: createdSubtasks,
          templateName: template.name,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('POST /api/templates/[id]/use error:', error)
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { success: false, error: message || 'Erro ao usar template' },
      { status: 500 }
    )
  }
}
