import { NextRequest, NextResponse } from 'next/server'
import { agentEventEmitter } from '@/lib/agents/event-emitter'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const limit = Math.min(
      Math.max(1, Number(searchParams.get('limit') ?? 50)),
      500
    )
    const type = searchParams.get('type')

    let events = agentEventEmitter.getHistory(limit)

    if (type) {
      events = events.filter((e) => e.type === type)
    }

    return NextResponse.json({
      success: true,
      data: events,
      total: events.length,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
