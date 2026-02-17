import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

type RouteParams = { params: Promise<{ id: string }> }

/**
 * PATCH /api/comments/[id] — Edita comentário
 *
 * Body: { content: string }
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const { content } = body

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Conteúdo é obrigatório' },
        { status: 400 }
      )
    }

    const existing = await prisma.comment.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Comentário não encontrado' },
        { status: 404 }
      )
    }

    const comment = await prisma.comment.update({
      where: { id },
      data: { content: content.trim() },
    })

    return NextResponse.json({ success: true, data: comment })
  } catch (error) {
    console.error('PATCH /api/comments/[id] error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao editar comentário' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/comments/[id] — Remove comentário (cascade para replies)
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const existing = await prisma.comment.findUnique({
      where: { id },
      include: { _count: { select: { replies: true } } },
    })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Comentário não encontrado' },
        { status: 404 }
      )
    }

    // Deletar replies recursivamente (profundidade 2) antes do pai
    // Prisma não suporta cascade em self-relations, então fazemos manual
    await deleteCommentTree(id)

    return NextResponse.json({
      success: true,
      message: 'Comentário removido com sucesso',
    })
  } catch (error) {
    console.error('DELETE /api/comments/[id] error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao remover comentário' },
      { status: 500 }
    )
  }
}

async function deleteCommentTree(commentId: string): Promise<void> {
  const replies = await prisma.comment.findMany({
    where: { parentId: commentId },
    select: { id: true },
  })

  for (const reply of replies) {
    await deleteCommentTree(reply.id)
  }

  await prisma.comment.delete({ where: { id: commentId } })
}
