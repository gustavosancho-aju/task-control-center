import { NextRequest, NextResponse } from 'next/server'
import { autoProcessor } from '@/lib/agents/auto-processor'

/**
 * POST /api/processor/tick
 *
 * Executa um ciclo completo de processamento da fila.
 * Projetado para ser chamado por serviços de cron externos (ex: cron-job.org)
 * em ambientes serverless onde setInterval não funciona de forma confiável.
 *
 * Proteção mínima via CRON_SECRET para evitar execuções não autorizadas.
 * Configure CRON_SECRET nas variáveis de ambiente do Vercel.
 *
 * Exemplo de uso com cron-job.org:
 *   URL: https://task-control-center.vercel.app/api/processor/tick
 *   Method: POST
 *   Header: Authorization: Bearer <CRON_SECRET>
 *   Interval: every 1 minute
 */
export async function POST(request: NextRequest) {
  // Verifica autenticação via CRON_SECRET (opcional mas recomendado)
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (token !== cronSecret) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
  }

  try {
    const result = await autoProcessor.tick()
    return NextResponse.json({
      success: true,
      data: {
        ...result,
        status: autoProcessor.getStatus(),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}

/**
 * GET /api/processor/tick
 *
 * Permite que Vercel Cron Jobs (vercel.json) acionem via GET.
 * Também útil para verificar se o endpoint está acessível.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    // Vercel Cron passa o secret via header automaticamente
    if (token !== cronSecret) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
  }

  try {
    const result = await autoProcessor.tick()
    return NextResponse.json({
      success: true,
      data: {
        ...result,
        status: autoProcessor.getStatus(),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
