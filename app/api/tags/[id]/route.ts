import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

type RouteParams = { params: Promise<{ id: string }> }

/**
 * GET /api/tags/[id] — Detalhes da tag com tasks associadas
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const tag = await prisma.tag.findUnique({
      where: { id },
      include: {
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            agentName: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { tasks: true } },
      },
    })

    if (!tag) {
      return NextResponse.json(
        { success: false, error: 'Tag não encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: tag })
  } catch (error) {
    console.error('GET /api/tags/[id] error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar tag' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/tags/[id] — Atualiza tag
 *
 * Body: { name?: string, color?: string, description?: string }
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, color, description } = body

    const existing = await prisma.tag.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Tag não encontrada' },
        { status: 404 }
      )
    }

    if (color && !/^#[0-9a-fA-F]{6}$/.test(color)) {
      return NextResponse.json(
        { success: false, error: 'Cor deve ser um hex válido (ex: #FF0000)' },
        { status: 400 }
      )
    }

    if (name && name.trim() !== existing.name) {
      const duplicate = await prisma.tag.findUnique({
        where: { name: name.trim() },
      })
      if (duplicate) {
        return NextResponse.json(
          { success: false, error: 'Já existe uma tag com este nome' },
          { status: 409 }
        )
      }
    }

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name.trim()
    if (color !== undefined) updateData.color = color
    if (description !== undefined) updateData.description = description || null

    const tag = await prisma.tag.update({
      where: { id },
      data: updateData,
      include: { _count: { select: { tasks: true } } },
    })

    return NextResponse.json({ success: true, data: tag })
  } catch (error) {
    console.error('PATCH /api/tags/[id] error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao atualizar tag' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/tags/[id] — Remove tag (desassocia das tasks)
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const existing = await prisma.tag.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Tag não encontrada' },
        { status: 404 }
      )
    }

    await prisma.tag.delete({ where: { id } })

    return NextResponse.json({
      success: true,
      message: `Tag "${existing.name}" removida com sucesso`,
    })
  } catch (error) {
    console.error('DELETE /api/tags/[id] error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao remover tag' },
      { status: 500 }
    )
  }
}
