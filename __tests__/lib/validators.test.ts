import { describe, it, expect } from 'vitest'
import {
  CreateTaskSchema,
  UpdateTaskSchema,
  AssignAgentSchema,
  CreateAgentSchema,
  TaskQuerySchema,
} from '@/lib/utils/validators'

describe('CreateTaskSchema', () => {
  it('valida tarefa com campos obrigatórios', () => {
    const result = CreateTaskSchema.safeParse({ title: 'Implementar feature X' })
    expect(result.success).toBe(true)
  })

  it('aplica priority padrão MEDIUM', () => {
    const result = CreateTaskSchema.safeParse({ title: 'Test' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.priority).toBe('MEDIUM')
  })

  it('rejeita title vazio', () => {
    const result = CreateTaskSchema.safeParse({ title: '' })
    expect(result.success).toBe(false)
  })

  it('rejeita title maior que 200 caracteres', () => {
    const result = CreateTaskSchema.safeParse({ title: 'a'.repeat(201) })
    expect(result.success).toBe(false)
  })

  it('valida todos os campos opcionais', () => {
    const result = CreateTaskSchema.safeParse({
      title: 'Task completa',
      description: 'Descrição detalhada',
      priority: 'HIGH',
      estimatedHours: 4,
    })
    expect(result.success).toBe(true)
  })

  it('rejeita priority inválida', () => {
    const result = CreateTaskSchema.safeParse({ title: 'Test', priority: 'CRITICAL' })
    expect(result.success).toBe(false)
  })

  it('rejeita estimatedHours negativo', () => {
    const result = CreateTaskSchema.safeParse({ title: 'Test', estimatedHours: -1 })
    expect(result.success).toBe(false)
  })
})

describe('UpdateTaskSchema', () => {
  it('valida update parcial (só status)', () => {
    const result = UpdateTaskSchema.safeParse({ status: 'IN_PROGRESS' })
    expect(result.success).toBe(true)
  })

  it('valida update parcial (só priority)', () => {
    const result = UpdateTaskSchema.safeParse({ priority: 'URGENT' })
    expect(result.success).toBe(true)
  })

  it('valida objeto vazio (update sem campos)', () => {
    const result = UpdateTaskSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('rejeita status inválido', () => {
    const result = UpdateTaskSchema.safeParse({ status: 'INVALID' })
    expect(result.success).toBe(false)
  })

  it('aceita dueDate null para remover data', () => {
    const result = UpdateTaskSchema.safeParse({ dueDate: null })
    expect(result.success).toBe(true)
  })
})

describe('AssignAgentSchema', () => {
  it('rejeita agentId vazio', () => {
    const result = AssignAgentSchema.safeParse({ agentId: '' })
    expect(result.success).toBe(false)
  })

  it('rejeita agentId inválido (não CUID)', () => {
    const result = AssignAgentSchema.safeParse({ agentId: 'not-a-cuid' })
    expect(result.success).toBe(false)
  })
})

describe('CreateAgentSchema', () => {
  it('valida agente válido', () => {
    const result = CreateAgentSchema.safeParse({
      name: 'MAESTRO',
      role: 'MAESTRO',
      description: 'Agente orquestrador',
      skills: ['planning', 'coordination'],
    })
    expect(result.success).toBe(true)
  })

  it('aplica skills padrão como array vazio', () => {
    const result = CreateAgentSchema.safeParse({ name: 'Test', role: 'SENTINEL' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.skills).toEqual([])
  })

  it('rejeita role inválido', () => {
    const result = CreateAgentSchema.safeParse({ name: 'Test', role: 'INVALID' })
    expect(result.success).toBe(false)
  })

  it('rejeita name vazio', () => {
    const result = CreateAgentSchema.safeParse({ name: '', role: 'MAESTRO' })
    expect(result.success).toBe(false)
  })

  it('rejeita name maior que 50 caracteres', () => {
    const result = CreateAgentSchema.safeParse({ name: 'a'.repeat(51), role: 'MAESTRO' })
    expect(result.success).toBe(false)
  })
})

describe('TaskQuerySchema', () => {
  it('aplica defaults: limit=50, offset=0', () => {
    const result = TaskQuerySchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.limit).toBe(50)
      expect(result.data.offset).toBe(0)
    }
  })

  it('faz coerção de strings para numbers', () => {
    const result = TaskQuerySchema.safeParse({ limit: '10', offset: '20' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.limit).toBe(10)
      expect(result.data.offset).toBe(20)
    }
  })

  it('rejeita limit maior que 100', () => {
    const result = TaskQuerySchema.safeParse({ limit: '200' })
    expect(result.success).toBe(false)
  })

  it('rejeita offset negativo', () => {
    const result = TaskQuerySchema.safeParse({ offset: '-1' })
    expect(result.success).toBe(false)
  })

  it('aceita todos os filtros', () => {
    const result = TaskQuerySchema.safeParse({
      status: 'TODO',
      priority: 'HIGH',
      search: 'feature',
      limit: '25',
      offset: '0',
    })
    expect(result.success).toBe(true)
  })
})
