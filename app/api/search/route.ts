import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

type SearchType = 'task' | 'agent' | 'tag' | 'template'

const VALID_TYPES: SearchType[] = ['task', 'agent', 'tag', 'template']

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')?.trim()
    const typeParam = searchParams.get('type')
    const limit = Math.min(Number(searchParams.get('limit') || '20'), 50)
    const offset = Math.max(Number(searchParams.get('offset') || '0'), 0)

    // Filtros avançados
    const status = searchParams.get('status') || undefined
    const priority = searchParams.get('priority') || undefined
    const agentId = searchParams.get('agentId') || undefined

    if (!q || q.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Parâmetro "q" deve ter pelo menos 2 caracteres' },
        { status: 400 }
      )
    }

    const types: SearchType[] = typeParam
      ? typeParam.split(',').filter((t): t is SearchType => VALID_TYPES.includes(t as SearchType))
      : VALID_TYPES

    const results: Record<string, { items: any[]; total: number }> = {}

    const searches: Promise<void>[] = []

    // --- Busca em Tarefas ---
    if (types.includes('task')) {
      searches.push(
        (async () => {
          const where: any = {
            OR: [
              { title: { contains: q, mode: 'insensitive' } },
              { description: { contains: q, mode: 'insensitive' } },
              { comments: { some: { content: { contains: q, mode: 'insensitive' } } } },
              { tags: { some: { name: { contains: q, mode: 'insensitive' } } } },
            ],
          }
          if (status) where.status = status
          if (priority) where.priority = priority
          if (agentId) where.agentId = agentId

          const [tasks, total] = await Promise.all([
            prisma.task.findMany({
              where,
              select: {
                id: true,
                title: true,
                description: true,
                status: true,
                priority: true,
                createdAt: true,
                updatedAt: true,
                agent: { select: { id: true, name: true, role: true } },
                tags: { select: { id: true, name: true, color: true } },
                _count: { select: { subtasks: true, comments: true } },
              },
              orderBy: [{ updatedAt: 'desc' }],
              take: limit,
              skip: offset,
            }),
            prisma.task.count({ where }),
          ])

          // Calcular relevância simples baseada em onde o termo aparece
          const scored = tasks.map((task) => {
            let relevance = 0
            const lowerQ = q.toLowerCase()
            if (task.title.toLowerCase().includes(lowerQ)) relevance += 10
            if (task.title.toLowerCase().startsWith(lowerQ)) relevance += 5
            if (task.description?.toLowerCase().includes(lowerQ)) relevance += 3
            if (task.tags.some((t) => t.name.toLowerCase().includes(lowerQ))) relevance += 2
            return { ...task, type: 'task' as const, relevance }
          })

          scored.sort((a, b) => b.relevance - a.relevance)

          results.tasks = { items: scored, total }
        })()
      )
    }

    // --- Busca em Agentes ---
    if (types.includes('agent')) {
      searches.push(
        (async () => {
          const where = {
            OR: [
              { name: { contains: q, mode: 'insensitive' as const } },
              { description: { contains: q, mode: 'insensitive' as const } },
              { skills: { has: q } },
            ],
          }

          const [agents, total] = await Promise.all([
            prisma.agent.findMany({
              where,
              select: {
                id: true,
                name: true,
                role: true,
                description: true,
                isActive: true,
                skills: true,
                tasksCompleted: true,
                successRate: true,
                _count: { select: { tasks: true } },
              },
              orderBy: { name: 'asc' },
              take: limit,
              skip: offset,
            }),
            prisma.agent.count({ where }),
          ])

          const scored = agents.map((agent) => {
            let relevance = 0
            const lowerQ = q.toLowerCase()
            if (agent.name.toLowerCase().includes(lowerQ)) relevance += 10
            if (agent.description?.toLowerCase().includes(lowerQ)) relevance += 3
            if (agent.skills.some((s) => s.toLowerCase().includes(lowerQ))) relevance += 2
            return { ...agent, type: 'agent' as const, relevance }
          })

          scored.sort((a, b) => b.relevance - a.relevance)

          results.agents = { items: scored, total }
        })()
      )
    }

    // --- Busca em Tags ---
    if (types.includes('tag')) {
      searches.push(
        (async () => {
          const where = {
            OR: [
              { name: { contains: q, mode: 'insensitive' as const } },
              { description: { contains: q, mode: 'insensitive' as const } },
            ],
          }

          const [tags, total] = await Promise.all([
            prisma.tag.findMany({
              where,
              select: {
                id: true,
                name: true,
                color: true,
                description: true,
                _count: { select: { tasks: true } },
              },
              orderBy: { name: 'asc' },
              take: limit,
              skip: offset,
            }),
            prisma.tag.count({ where }),
          ])

          const scored = tags.map((tag) => {
            let relevance = 0
            const lowerQ = q.toLowerCase()
            if (tag.name.toLowerCase().includes(lowerQ)) relevance += 10
            if (tag.name.toLowerCase() === lowerQ) relevance += 5
            if (tag.description?.toLowerCase().includes(lowerQ)) relevance += 3
            return { ...tag, type: 'tag' as const, relevance }
          })

          scored.sort((a, b) => b.relevance - a.relevance)

          results.tags = { items: scored, total }
        })()
      )
    }

    // --- Busca em Templates ---
    if (types.includes('template')) {
      searches.push(
        (async () => {
          const where = {
            OR: [
              { name: { contains: q, mode: 'insensitive' as const } },
              { description: { contains: q, mode: 'insensitive' as const } },
              { defaultTitle: { contains: q, mode: 'insensitive' as const } },
            ],
          }

          const [templates, total] = await Promise.all([
            prisma.taskTemplate.findMany({
              where,
              select: {
                id: true,
                name: true,
                description: true,
                defaultTitle: true,
                defaultPriority: true,
                defaultAgentRole: true,
                defaultTags: true,
                isActive: true,
                usageCount: true,
              },
              orderBy: { usageCount: 'desc' },
              take: limit,
              skip: offset,
            }),
            prisma.taskTemplate.count({ where }),
          ])

          const scored = templates.map((tpl) => {
            let relevance = 0
            const lowerQ = q.toLowerCase()
            if (tpl.name.toLowerCase().includes(lowerQ)) relevance += 10
            if (tpl.description?.toLowerCase().includes(lowerQ)) relevance += 3
            if (tpl.defaultTitle.toLowerCase().includes(lowerQ)) relevance += 5
            relevance += Math.min(tpl.usageCount, 5) // boost por popularidade
            return { ...tpl, type: 'template' as const, relevance }
          })

          scored.sort((a, b) => b.relevance - a.relevance)

          results.templates = { items: scored, total }
        })()
      )
    }

    await Promise.all(searches)

    // Total geral
    const totalResults = Object.values(results).reduce((sum, r) => sum + r.total, 0)

    return NextResponse.json({
      success: true,
      query: q,
      totalResults,
      results,
    })
  } catch (error) {
    console.error('GET /api/search error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao realizar busca' },
      { status: 500 }
    )
  }
}
