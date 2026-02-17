import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { logCommentCreate } from '@/lib/audit/logger'

type RouteParams = { params: Promise<{ id: string }> }

/**
 * GET /api/tasks/[id]/comments — Lista comentários com replies aninhadas
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

    // Busca comentários raiz (sem parentId) com replies aninhadas (2 níveis)
    const comments = await prisma.comment.findMany({
      where: { taskId: id, parentId: null },
      include: {
        replies: {
          include: {
            replies: {
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Contagem total
    const total = await prisma.comment.count({ where: { taskId: id } })

    return NextResponse.json({ success: true, data: comments, total })
  } catch (error) {
    console.error('GET /api/tasks/[id]/comments error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar comentários' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/tasks/[id]/comments — Cria comentário
 *
 * Body: { content: string, authorName?: string, authorType?: 'USER'|'AGENT'|'SYSTEM', parentId?: string }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const { content, authorName, authorType, parentId } = body

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Conteúdo é obrigatório' },
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

    // Valida parentId se fornecido
    if (parentId) {
      const parent = await prisma.comment.findUnique({
        where: { id: parentId },
        select: { id: true, taskId: true },
      })
      if (!parent) {
        return NextResponse.json(
          { success: false, error: 'Comentário pai não encontrado' },
          { status: 404 }
        )
      }
      if (parent.taskId !== id) {
        return NextResponse.json(
          { success: false, error: 'Comentário pai pertence a outra tarefa' },
          { status: 400 }
        )
      }
    }

    const validTypes = ['USER', 'AGENT', 'SYSTEM'] as const
    const resolvedType = validTypes.includes(authorType) ? authorType : 'USER'

    const comment = await prisma.comment.create({
      data: {
        taskId: id,
        content: content.trim(),
        authorName: authorName || 'Usuário',
        authorType: resolvedType,
        parentId: parentId || null,
      },
      include: {
        replies: true,
      },
    })

    logCommentCreate(comment.id, id, comment.authorName)

    return NextResponse.json({ success: true, data: comment }, { status: 201 })
  } catch (error) {
    console.error('POST /api/tasks/[id]/comments error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao criar comentário' },
      { status: 500 }
    )
  }
}
