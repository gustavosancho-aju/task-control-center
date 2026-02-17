import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

// TODO: Add to uptime monitoring (e.g., Better Uptime, Checkly, UptimeRobot)
// GET /api/health — used by load balancers, k8s liveness probes, monitoring services

export async function GET() {
  const startTime = Date.now()
  const checks: Record<string, { status: 'ok' | 'error'; latencyMs?: number; detail?: string }> =
    {}

  // ─── Database check ──────────────────────────────────────────────────────────
  try {
    const dbStart = Date.now()
    await prisma.$queryRaw`SELECT 1`
    checks.database = { status: 'ok', latencyMs: Date.now() - dbStart }
  } catch (error) {
    checks.database = {
      status: 'error',
      detail: process.env.NODE_ENV === 'development' ? String(error) : 'Connection failed',
    }
  }

  // ─── Memory check ────────────────────────────────────────────────────────────
  const memUsage = process.memoryUsage()
  const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024)
  const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024)
  checks.memory = {
    status: heapUsedMB < heapTotalMB * 0.9 ? 'ok' : 'error',
    detail: `${heapUsedMB}MB / ${heapTotalMB}MB`,
  }

  // TODO: Add more checks as needed:
  // checks.redis = await checkRedis()
  // checks.anthropic = await checkAnthropicPing()
  // checks.storage = await checkStorageAccess()

  const allOk = Object.values(checks).every((c) => c.status === 'ok')
  const status = allOk ? 200 : 503

  return NextResponse.json(
    {
      status: allOk ? 'ok' : 'degraded',
      version: process.env.npm_package_version ?? '0.1.0',
      environment: process.env.NODE_ENV,
      uptime: Math.round(process.uptime()),
      latencyMs: Date.now() - startTime,
      checks,
      // TODO: Add analytics integration here
      // analytics: { provider: 'vercel', enabled: !!process.env.NEXT_PUBLIC_ANALYTICS_ID }
    },
    { status }
  )
}
