import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

/**
 * GET /api/templates — Lista templates ativos
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const agentRole = searchParams.get('agentRole')
    const tag = searchParams.get('tag')
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const where: Record<string, unknown> = {}

    if (!includeInactive) {
      where.isActive = true
    }

    if (agentRole) {
      where.defaultAgentRole = agentRole
    }

    if (tag) {
      where.defaultTags = { has: tag }
    }

    const templates = await prisma.taskTemplate.findMany({
      where,
      orderBy: [{ usageCount: 'desc' }, { name: 'asc' }],
    })

    return NextResponse.json({ success: true, data: templates, total: templates.length })
  } catch (error) {
    console.error('GET /api/templates error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar templates' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/templates — Cria novo template
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      description,
      defaultTitle,
      defaultDescription,
      defaultPriority,
      defaultAgentRole,
      defaultTags,
      subtaskTemplates,
    } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Nome é obrigatório' },
        { status: 400 }
      )
    }

    if (!defaultTitle || typeof defaultTitle !== 'string' || defaultTitle.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Título padrão é obrigatório' },
        { status: 400 }
      )
    }

    const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
    if (!defaultPriority || !validPriorities.includes(defaultPriority)) {
      return NextResponse.json(
        { success: false, error: 'Prioridade inválida' },
        { status: 400 }
      )
    }

    const validRoles = ['MAESTRO', 'SENTINEL', 'ARCHITECTON', 'PIXEL']
    if (defaultAgentRole && !validRoles.includes(defaultAgentRole)) {
      return NextResponse.json(
        { success: false, error: 'Role de agente inválida' },
        { status: 400 }
      )
    }

    // Check for duplicate name
    const existing = await prisma.taskTemplate.findFirst({
      where: { name: name.trim() },
    })
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Já existe um template com este nome' },
        { status: 409 }
      )
    }

    const template = await prisma.taskTemplate.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        defaultTitle: defaultTitle.trim(),
        defaultDescription: defaultDescription?.trim() || null,
        defaultPriority,
        defaultAgentRole: defaultAgentRole || null,
        defaultTags: Array.isArray(defaultTags) ? defaultTags : [],
        subtaskTemplates: subtaskTemplates || null,
      },
    })

    return NextResponse.json({ success: true, data: template }, { status: 201 })
  } catch (error) {
    console.error('POST /api/templates error:', error)
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { success: false, error: message || 'Erro ao criar template' },
      { status: 500 }
    )
  }
}
