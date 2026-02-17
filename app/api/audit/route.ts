import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import type { AuditAction } from "@prisma/client"

// GET /api/audit?entityType=Task&entityId=xxx&action=CREATE&from=2024-01-01&to=2024-12-31&search=xxx&limit=50&offset=0
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const entityType = searchParams.get("entityType") || undefined
    const entityId = searchParams.get("entityId") || undefined
    const action = searchParams.get("action") as AuditAction | undefined
    const from = searchParams.get("from") || undefined
    const to = searchParams.get("to") || undefined
    const search = searchParams.get("search") || undefined
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200)
    const offset = parseInt(searchParams.get("offset") || "0", 10)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}

    if (entityType) where.entityType = entityType
    if (entityId) where.entityId = entityId
    if (action) where.action = action

    if (from || to) {
      where.createdAt = {}
      if (from) where.createdAt.gte = new Date(from)
      if (to) where.createdAt.lte = new Date(to + "T23:59:59.999Z")
    }

    if (search) {
      where.OR = [
        { entityType: { contains: search, mode: "insensitive" } },
        { entityId: { contains: search, mode: "insensitive" } },
        { performedBy: { contains: search, mode: "insensitive" } },
      ]
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.auditLog.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: logs,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + logs.length < total,
      },
    })
  } catch (error) {
    console.error("GET /api/audit error:", error)
    return NextResponse.json(
      { success: false, error: "Erro ao buscar logs de auditoria" },
      { status: 500 }
    )
  }
}
