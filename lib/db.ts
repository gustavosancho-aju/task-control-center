import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * In Vercel serverless, append connection_limit=1 to avoid pool exhaustion.
 * Each function invocation gets its own Node.js context, so many parallel
 * invocations would otherwise each try to open the default pool of 5 connections.
 */
function buildDatasourceUrl(): string | undefined {
  const url = process.env.DATABASE_URL
  if (!url || !process.env.VERCEL) return url
  try {
    const parsed = new URL(url)
    if (!parsed.searchParams.has('connection_limit')) {
      parsed.searchParams.set('connection_limit', '1')
    }
    if (!parsed.searchParams.has('pool_timeout')) {
      parsed.searchParams.set('pool_timeout', '15')
    }
    return parsed.toString()
  } catch {
    return url
  }
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: buildDatasourceUrl() } },
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default prisma
