import { NextRequest, NextResponse } from 'next/server'
import { getAgentPerformance } from '@/lib/agents/learning'

/**
 * GET /api/agents/[id]/performance — Retorna métricas de performance do agente
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const performance = await getAgentPerformance(id)
    return NextResponse.json({ success: true, data: performance })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const status = message.includes('não encontrado') ? 404 : 500
    return NextResponse.json(
      { success: false, error: message },
      { status }
    )
  }
}
