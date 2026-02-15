import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { CreateTaskSchema, TaskQuerySchema } from '@/lib/utils/validators'
import { TaskStatus } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = TaskQuerySchema.parse({
      status: searchParams.get('status') || undefined,
      priority: searchParams.get('priority') || undefined,
      agentId: searchParams.get('agentId') || undefined,
      search: searchParams.get('search') || undefined,
      limit: searchParams.get('limit') || undefined,
      offset: searchParams.get('offset') || undefined,
    })

    const where: any = {}
    if (query.status) where.status = query.status
    if (query.priority) where.priority = query.priority
    if (query.agentId) where.agentId = query.agentId
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ]
    }

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: {
          agent: { select: { id: true, name: true, role: true } },
          subtasks: { select: { id: true, title: true, status: true } },
          _count: { select: { statusHistory: true } }
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        take: query.limit,
        skip: query.offset,
      }),
      prisma.task.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: tasks,
      pagination: { total, limit: query.limit, offset: query.offset, hasMore: query.offset + tasks.length < total }
    })
  } catch (error) {
    console.error('GET /api/tasks error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao buscar tarefas' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = CreateTaskSchema.parse(body)

    const task = await prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        priority: data.priority,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        estimatedHours: data.estimatedHours,
        parentId: data.parentId,
        statusHistory: {
          create: { fromStatus: null, toStatus: TaskStatus.TODO, notes: 'Tarefa criada' }
        }
      },
      include: { agent: true, statusHistory: true }
    })

    return NextResponse.json({ success: true, data: task }, { status: 201 })
  } catch (error) {
    console.error('POST /api/tasks error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao criar tarefa' }, { status: 500 })
  }
}
