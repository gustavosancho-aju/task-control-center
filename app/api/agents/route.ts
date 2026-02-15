import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { CreateAgentSchema } from '@/lib/utils/validators'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('active') !== 'false'

    const agents = await prisma.agent.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      include: { _count: { select: { tasks: true } } },
      orderBy: { name: 'asc' },
    })

    const agentsWithStats = await Promise.all(
      agents.map(async (agent) => {
        const tasksByStatus = await prisma.task.groupBy({
          by: ['status'],
          where: { agentId: agent.id },
          _count: true,
        })
        return {
          ...agent,
          stats: {
            total: agent._count.tasks,
            byStatus: Object.fromEntries(tasksByStatus.map((s) => [s.status, s._count])),
          },
        }
      })
    )

    return NextResponse.json({ success: true, data: agentsWithStats })
  } catch (error) {
    console.error('GET /api/agents error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao buscar agentes' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = CreateAgentSchema.parse(body)

    const existing = await prisma.agent.findUnique({ where: { name: data.name } })
    if (existing) {
      return NextResponse.json({ success: false, error: 'Ja existe um agente com este nome' }, { status: 409 })
    }

    const agent = await prisma.agent.create({
      data: { name: data.name, role: data.role, description: data.description, skills: data.skills },
    })

    return NextResponse.json({ success: true, data: agent }, { status: 201 })
  } catch (error) {
    console.error('POST /api/agents error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao criar agente' }, { status: 500 })
  }
}
