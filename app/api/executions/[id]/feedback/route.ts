import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { recordFeedback } from '@/lib/agents/learning'

/**
 * GET /api/executions/[id]/feedback — Retorna o feedback de uma execução
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const feedback = await prisma.executionFeedback.findUnique({
      where: { executionId: id },
    })

    if (!feedback) {
      return NextResponse.json(
        { success: false, error: 'Feedback não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: feedback })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/executions/[id]/feedback — Registra feedback para uma execução
 *
 * Body: { rating: number (1-5), wasAccepted: boolean, comments?: string, improvements?: string[] }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const { rating, wasAccepted, comments, improvements } = body

    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, error: 'Rating deve ser um número entre 1 e 5' },
        { status: 400 }
      )
    }

    if (typeof wasAccepted !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'wasAccepted deve ser um booleano' },
        { status: 400 }
      )
    }

    const feedback = await recordFeedback(id, {
      rating,
      wasAccepted,
      comments,
      improvements,
    })

    return NextResponse.json({
      success: true,
      data: feedback,
      message: 'Feedback registrado com sucesso',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const status = message.includes('não encontrad') ? 404 : 500
    return NextResponse.json(
      { success: false, error: message },
      { status }
    )
  }
}
