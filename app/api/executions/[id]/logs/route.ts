import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import type { LogLevel } from '@prisma/client'

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)

    const stream = searchParams.get('stream') === 'true'
    const level = searchParams.get('level') as LogLevel | null
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const execution = await prisma.agentExecution.findUnique({
      where: { id },
      select: { id: true, status: true },
    })

    if (!execution) {
      return NextResponse.json({ success: false, error: 'Execução não encontrada' }, { status: 404 })
    }

    // SSE streaming mode
    if (stream) {
      const encoder = new TextEncoder()
      let lastLogId = ''
      let closed = false

      const readable = new ReadableStream({
        async start(controller) {
          const sendLogs = async () => {
            const where: Record<string, unknown> = { executionId: id }
            if (lastLogId) where.id = { gt: lastLogId }
            if (level) where.level = level

            const logs = await prisma.executionLog.findMany({
              where,
              orderBy: { createdAt: 'asc' },
              take: 100,
            })

            for (const log of logs) {
              if (closed) return
              const data = JSON.stringify(log)
              controller.enqueue(encoder.encode(`data: ${data}\n\n`))
              lastLogId = log.id
            }
          }

          // Send existing logs first
          await sendLogs()

          // Poll for new logs while execution is active
          const interval = setInterval(async () => {
            if (closed) {
              clearInterval(interval)
              return
            }

            try {
              await sendLogs()

              const current = await prisma.agentExecution.findUnique({
                where: { id },
                select: { status: true },
              })

              if (!current || !['RUNNING', 'QUEUED'].includes(current.status)) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done', status: current?.status })}\n\n`))
                clearInterval(interval)
                controller.close()
                closed = true
              }
            } catch {
              clearInterval(interval)
              if (!closed) {
                controller.close()
                closed = true
              }
            }
          }, 1000)
        },
        cancel() {
          closed = true
        },
      })

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      })
    }

    // Standard paginated mode
    const where: Record<string, unknown> = { executionId: id }
    if (level) where.level = level

    const [logs, total] = await Promise.all([
      prisma.executionLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.executionLog.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: logs,
      pagination: { total, limit, offset, hasMore: offset + logs.length < total },
    })
  } catch (error) {
    console.error('GET /api/executions/[id]/logs error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao buscar logs' }, { status: 500 })
  }
}
