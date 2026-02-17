import { agentEventEmitter } from '@/lib/agents/event-emitter'
import type { EventPayload } from '@/lib/agents/event-emitter'

export const dynamic = 'force-dynamic'

export async function GET() {
  const encoder = new TextEncoder()
  let cleanup: (() => void) | null = null

  const stream = new ReadableStream({
    start(controller) {
      const send = (payload: EventPayload) => {
        try {
          const data = `data: ${JSON.stringify(payload)}\n\n`
          controller.enqueue(encoder.encode(data))
        } catch {
          // Cliente desconectou
          cleanup?.()
        }
      }

      // Heartbeat a cada 30s para manter a conexão viva
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'))
        } catch {
          cleanup?.()
        }
      }, 30_000)

      agentEventEmitter.on('*', send)

      cleanup = () => {
        agentEventEmitter.off('*', send)
        clearInterval(heartbeat)
      }
    },
    cancel() {
      cleanup?.()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
