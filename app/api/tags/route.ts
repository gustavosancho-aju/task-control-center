import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

/**
 * GET /api/tags — Lista todas as tags com contagem de tasks
 */
export async function GET() {
  try {
    const tags = await prisma.tag.findMany({
      include: {
        _count: { select: { tasks: true } },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ success: true, data: tags })
  } catch (error) {
    console.error('GET /api/tags error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar tags' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/tags — Cria nova tag
 *
 * Body: { name: string, color: string, description?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, color, description } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Nome é obrigatório' },
        { status: 400 }
      )
    }

    if (!color || typeof color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(color)) {
      return NextResponse.json(
        { success: false, error: 'Cor deve ser um hex válido (ex: #FF0000)' },
        { status: 400 }
      )
    }

    const existing = await prisma.tag.findUnique({
      where: { name: name.trim() },
    })
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Já existe uma tag com este nome' },
        { status: 409 }
      )
    }

    const tag = await prisma.tag.create({
      data: {
        name: name.trim(),
        color,
        description: description || null,
      },
      include: {
        _count: { select: { tasks: true } },
      },
    })

    return NextResponse.json({ success: true, data: tag }, { status: 201 })
  } catch (error) {
    console.error('POST /api/tags error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao criar tag' },
      { status: 500 }
    )
  }
}
