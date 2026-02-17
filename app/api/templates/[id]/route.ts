import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

type RouteParams = { params: Promise<{ id: string }> }

/**
 * GET /api/templates/[id] — Detalhes do template
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
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

    return NextResponse.json({ success: true, data: template })
  } catch (error) {
    console.error('GET /api/templates/[id] error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar template' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/templates/[id] — Atualiza template
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()

    const existing = await prisma.taskTemplate.findUnique({
      where: { id },
    })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Template não encontrado' },
        { status: 404 }
      )
    }

    const updateData: Record<string, unknown> = {}

    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'Nome não pode ser vazio' },
          { status: 400 }
        )
      }
      const dup = await prisma.taskTemplate.findFirst({
        where: { name: body.name.trim(), id: { not: id } },
      })
      if (dup) {
        return NextResponse.json(
          { success: false, error: 'Já existe um template com este nome' },
          { status: 409 }
        )
      }
      updateData.name = body.name.trim()
    }

    if (body.description !== undefined) updateData.description = body.description?.trim() || null
    if (body.defaultTitle !== undefined) {
      if (typeof body.defaultTitle !== 'string' || body.defaultTitle.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'Título padrão não pode ser vazio' },
          { status: 400 }
        )
      }
      updateData.defaultTitle = body.defaultTitle.trim()
    }
    if (body.defaultDescription !== undefined)
      updateData.defaultDescription = body.defaultDescription?.trim() || null
    if (body.defaultPriority !== undefined) {
      const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
      if (!validPriorities.includes(body.defaultPriority)) {
        return NextResponse.json(
          { success: false, error: 'Prioridade inválida' },
          { status: 400 }
        )
      }
      updateData.defaultPriority = body.defaultPriority
    }
    if (body.defaultAgentRole !== undefined) {
      const validRoles = ['MAESTRO', 'SENTINEL', 'ARCHITECTON', 'PIXEL']
      if (body.defaultAgentRole !== null && !validRoles.includes(body.defaultAgentRole)) {
        return NextResponse.json(
          { success: false, error: 'Role de agente inválida' },
          { status: 400 }
        )
      }
      updateData.defaultAgentRole = body.defaultAgentRole
    }
    if (body.defaultTags !== undefined) updateData.defaultTags = Array.isArray(body.defaultTags) ? body.defaultTags : []
    if (body.subtaskTemplates !== undefined) updateData.subtaskTemplates = body.subtaskTemplates
    if (body.isActive !== undefined) updateData.isActive = Boolean(body.isActive)

    const template = await prisma.taskTemplate.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ success: true, data: template })
  } catch (error) {
    console.error('PATCH /api/templates/[id] error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao atualizar template' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/templates/[id] — Desativa template (soft delete)
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const existing = await prisma.taskTemplate.findUnique({
      where: { id },
    })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Template não encontrado' },
        { status: 404 }
      )
    }

    await prisma.taskTemplate.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true, message: 'Template desativado' })
  } catch (error) {
    console.error('DELETE /api/templates/[id] error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao desativar template' },
      { status: 500 }
    )
  }
}
