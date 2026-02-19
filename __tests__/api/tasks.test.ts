import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock prisma before importing the route
vi.mock('@/lib/db', () => ({
  default: {
    task: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  },
}))

vi.mock('@/lib/audit/logger', () => ({
  logTaskCreate: vi.fn(),
}))

vi.mock('@/lib/cache', () => ({
  cache: {
    get: vi.fn().mockReturnValue(null),
    set: vi.fn(),
    invalidatePattern: vi.fn(),
  },
}))

import prisma from '@/lib/db'
import { GET, POST } from '@/app/api/tasks/route'

const mockPrisma = prisma as unknown as {
  task: {
    findMany: ReturnType<typeof vi.fn>
    count: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
  }
}

const mockTask = {
  id: 'clxxxxxxxxxxxxxxx001',
  title: 'Tarefa de teste',
  status: 'TODO',
  priority: 'MEDIUM',
  agentName: null,
  agentId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  dueDate: null,
  completedAt: null,
  estimatedHours: null,
  actualHours: null,
  parentId: null,
  agent: null,
  subtasks: [],
  _count: { statusHistory: 0 },
}

function makeRequest(url: string, options?: Omit<RequestInit, 'signal'> & { signal?: AbortSignal }) {
  return new NextRequest(new URL(url, 'http://localhost:3000'), options)
}

describe('GET /api/tasks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.task.findMany.mockResolvedValue([mockTask])
    mockPrisma.task.count.mockResolvedValue(1)
  })

  it('retorna lista de tarefas com sucesso', async () => {
    const req = makeRequest('http://localhost:3000/api/tasks')
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data).toHaveLength(1)
    expect(json.pagination).toBeDefined()
  })

  it('retorna paginação correta', async () => {
    const req = makeRequest('http://localhost:3000/api/tasks?limit=10&offset=0')
    const res = await GET(req)
    const json = await res.json()

    expect(json.pagination.total).toBe(1)
    expect(json.pagination.limit).toBe(10)
    expect(json.pagination.offset).toBe(0)
  })

  it('filtra por status', async () => {
    const req = makeRequest('http://localhost:3000/api/tasks?status=TODO')
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'TODO' }),
      })
    )
  })

  it('retorna 500 quando prisma falha', async () => {
    mockPrisma.task.findMany.mockRejectedValueOnce(new Error('DB error'))

    const req = makeRequest('http://localhost:3000/api/tasks')
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json.success).toBe(false)
  })
})

describe('POST /api/tasks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.task.create.mockResolvedValue({
      ...mockTask,
      id: 'clxxxxxxxxxxxxxxx002',
      title: 'Nova tarefa',
      statusHistory: [],
    })
  })

  it('cria tarefa com dados válidos', async () => {
    const req = makeRequest('http://localhost:3000/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ title: 'Nova tarefa', priority: 'HIGH' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.success).toBe(true)
    expect(json.data).toBeDefined()
  })

  it('rejeita body inválido com 500 (Zod parse error)', async () => {
    const req = makeRequest('http://localhost:3000/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ title: '' }), // title vazio não passa no Zod
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req)
    const json = await res.json()

    expect(json.success).toBe(false)
  })

  it('retorna 500 quando prisma falha', async () => {
    mockPrisma.task.create.mockRejectedValueOnce(new Error('DB error'))

    const req = makeRequest('http://localhost:3000/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ title: 'Tarefa válida' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json.success).toBe(false)
  })
})
