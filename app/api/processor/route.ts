import { NextRequest, NextResponse } from 'next/server'
import { autoProcessor } from '@/lib/agents/auto-processor'

/**
 * GET /api/processor — Retorna status do processador automático
 */
export async function GET() {
  try {
    const status = autoProcessor.getStatus()
    return NextResponse.json({ success: true, data: status })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/processor — Controla o processador (start/stop/interval)
 *
 * Body: { action: 'start' | 'stop', interval?: number }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, interval } = body

    if (action === 'start') {
      if (typeof interval === 'number') {
        autoProcessor.setInterval(interval)
      }
      autoProcessor.start()
      return NextResponse.json({
        success: true,
        message: 'Processador iniciado',
        data: autoProcessor.getStatus(),
      })
    }

    if (action === 'stop') {
      autoProcessor.stop()
      return NextResponse.json({
        success: true,
        message: 'Processador parado',
        data: autoProcessor.getStatus(),
      })
    }

    if (action === 'interval' && typeof interval === 'number') {
      autoProcessor.setInterval(interval)
      return NextResponse.json({
        success: true,
        message: `Intervalo atualizado para ${interval}s`,
        data: autoProcessor.getStatus(),
      })
    }

    return NextResponse.json(
      { success: false, error: 'Ação inválida. Use: start, stop, ou interval' },
      { status: 400 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
