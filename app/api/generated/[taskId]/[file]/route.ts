import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import * as fs from 'fs'
import * as path from 'path'

const CONTENT_TYPES: Record<string, string> = {
  'index.html': 'text/html; charset=utf-8',
  'style.css': 'text/css; charset=utf-8',
  'script.js': 'application/javascript; charset=utf-8',
}

type RouteParams = { params: Promise<{ taskId: string; file: string }> }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { taskId, file } = await params

  const contentType = CONTENT_TYPES[file]
  if (!contentType) {
    return new NextResponse('Not found', { status: 404 })
  }

  // 1. Tentar filesystem local (dev)
  try {
    const filePath = path.join(process.cwd(), 'public', 'generated', taskId, file)
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8')
      return new NextResponse(content, { headers: { 'Content-Type': contentType } })
    }
  } catch { /* read-only em produção */ }

  // 2. Fallback: ler do metadata do AgentExecution (Vercel)
  const execution = await prisma.agentExecution.findFirst({
    where: {
      taskId,
      agent: { role: 'PIXEL' },
      status: 'COMPLETED',
    },
    select: { metadata: true },
    orderBy: { completedAt: 'desc' },
  })

  const files = (execution?.metadata as Record<string, Record<string, string>> | null)?.files
  const content = files?.[file]

  if (!content) {
    return new NextResponse('File not found', { status: 404 })
  }

  return new NextResponse(content, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
