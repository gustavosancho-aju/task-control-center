import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

type RouteParams = { params: Promise<{ id: string }> }

/**
 * GET /api/tasks/[id]/tags — Lista tags da tarefa
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const task = await prisma.task.findUnique({
      where: { id },
      select: {
        id: true,
        tags: {
          orderBy: { name: 'asc' },
        },
      },
    })

    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Tarefa não encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: task.tags })
  } catch (error) {
    console.error('GET /api/tasks/[id]/tags error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar tags da tarefa' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/tasks/[id]/tags — Adiciona tag à tarefa
 *
 * Body: { tagId: string }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const { tagId } = body

    if (!tagId) {
      return NextResponse.json(
        { success: false, error: 'tagId é obrigatório' },
        { status: 400 }
      )
    }

    const [task, tag] = await Promise.all([
      prisma.task.findUnique({ where: { id }, select: { id: true } }),
      prisma.tag.findUnique({ where: { id: tagId }, select: { id: true } }),
    ])

    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Tarefa não encontrada' },
        { status: 404 }
      )
    }
    if (!tag) {
      return NextResponse.json(
        { success: false, error: 'Tag não encontrada' },
        { status: 404 }
      )
    }

    const updated = await prisma.task.update({
      where: { id },
      data: {
        tags: { connect: { id: tagId } },
      },
      select: {
        id: true,
        tags: { orderBy: { name: 'asc' } },
      },
    })

    return NextResponse.json({ success: true, data: updated.tags })
  } catch (error) {
    console.error('POST /api/tasks/[id]/tags error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao adicionar tag' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/tasks/[id]/tags — Remove tag da tarefa
 *
 * Body: { tagId: string }
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const { tagId } = body

    if (!tagId) {
      return NextResponse.json(
        { success: false, error: 'tagId é obrigatório' },
        { status: 400 }
      )
    }

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

    const updated = await prisma.task.update({
      where: { id },
      data: {
        tags: { disconnect: { id: tagId } },
      },
      select: {
        id: true,
        tags: { orderBy: { name: 'asc' } },
      },
    })

    return NextResponse.json({ success: true, data: updated.tags })
  } catch (error) {
    console.error('DELETE /api/tasks/[id]/tags error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao remover tag' },
      { status: 500 }
    )
  }
}
