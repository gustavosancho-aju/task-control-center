import { z } from 'zod'

export const TaskStatusEnum = z.enum(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'BLOCKED'])
export const TaskPriorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
export const AgentRoleEnum = z.enum(['MAESTRO', 'SENTINEL', 'ARCHITECTON', 'PIXEL'])

export const CreateTaskSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(200, 'Título muito longo'),
  description: z.string().optional(),
  priority: TaskPriorityEnum.optional().default('MEDIUM'),
  dueDate: z.string().datetime().optional(),
  estimatedHours: z.number().positive().optional(),
  parentId: z.string().cuid().optional(),
  autoOrchestrate: z.boolean().optional().default(false),
})

export const UpdateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  priority: TaskPriorityEnum.optional(),
  status: TaskStatusEnum.optional(),
  dueDate: z.string().datetime().optional().nullable(),
  estimatedHours: z.number().positive().optional().nullable(),
  actualHours: z.number().positive().optional().nullable(),
})

export const AssignAgentSchema = z.object({
  agentId: z.string().cuid(),
})

export const CreateAgentSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(50),
  role: AgentRoleEnum,
  description: z.string().optional(),
  skills: z.array(z.string()).optional().default([]),
})

export const TaskQuerySchema = z.object({
  status: TaskStatusEnum.optional(),
  priority: TaskPriorityEnum.optional(),
  agentId: z.string().cuid().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
  offset: z.coerce.number().int().nonnegative().optional().default(0),
})

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>
export type AssignAgentInput = z.infer<typeof AssignAgentSchema>
export type CreateAgentInput = z.infer<typeof CreateAgentSchema>
export type TaskQueryInput = z.infer<typeof TaskQuerySchema>
