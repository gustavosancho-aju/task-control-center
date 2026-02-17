import prisma from '@/lib/db'
import { agentEventEmitter, AgentEventTypes } from '@/lib/agents/event-emitter'
import type { AgentQueue, QueueStatus } from '@prisma/client'

interface AddToQueueOptions {
  priority?: number
  scheduledFor?: Date
  maxAttempts?: number
}

interface QueueStats {
  pending: number
  processing: number
  completed: number
  failed: number
  total: number
}

class QueueManager {
  async addToQueue(
    taskId: string,
    agentId: string,
    options: AddToQueueOptions = {}
  ): Promise<AgentQueue> {
    const entry = await prisma.agentQueue.create({
      data: {
        taskId,
        agentId,
        priority: options.priority ?? 0,
        scheduledFor: options.scheduledFor ?? null,
        maxAttempts: options.maxAttempts ?? 3,
      },
    })

    agentEventEmitter.emit(
      AgentEventTypes.QUEUE_ADDED,
      { priority: entry.priority },
      { taskId, agentId }
    )

    return entry
  }

  async getNextInQueue(agentId?: string): Promise<AgentQueue | null> {
    const now = new Date()

    return prisma.agentQueue.findFirst({
      where: {
        status: 'PENDING',
        ...(agentId ? { agentId } : {}),
        OR: [
          { scheduledFor: null },
          { scheduledFor: { lte: now } },
        ],
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' },
      ],
    })
  }

  async processQueue(): Promise<void> {
    let entry = await this.getNextInQueue()

    while (entry) {
      await prisma.agentQueue.update({
        where: { id: entry.id },
        data: { status: 'PROCESSING', attempts: { increment: 1 } },
      })

      try {
        await this.executeTask(entry.taskId, entry.agentId)

        await prisma.agentQueue.update({
          where: { id: entry.id },
          data: { status: 'COMPLETED' },
        })

        agentEventEmitter.emit(
          AgentEventTypes.QUEUE_PROCESSED,
          { status: 'COMPLETED' },
          { taskId: entry.taskId, agentId: entry.agentId }
        )
      } catch (error) {
        const updated = await prisma.agentQueue.findUnique({
          where: { id: entry.id },
        })

        const attempts = updated?.attempts ?? entry.attempts + 1
        const maxAttempts = updated?.maxAttempts ?? entry.maxAttempts
        const exhausted = attempts >= maxAttempts

        await prisma.agentQueue.update({
          where: { id: entry.id },
          data: { status: exhausted ? 'FAILED' : 'PENDING' },
        })

        console.error(
          `Queue processing error for task ${entry.taskId} (attempt ${attempts}/${maxAttempts}):`,
          error instanceof Error ? error.message : error
        )
      }

      entry = await this.getNextInQueue()
    }
  }

  async removeFromQueue(taskId: string): Promise<void> {
    await prisma.agentQueue.deleteMany({
      where: { taskId },
    })
  }

  async getQueueStatus(): Promise<QueueStats> {
    const counts = await prisma.agentQueue.groupBy({
      by: ['status'],
      _count: { id: true },
    })

    const stats: QueueStats = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      total: 0,
    }

    for (const row of counts) {
      const key = row.status.toLowerCase() as keyof Omit<QueueStats, 'total'>
      stats[key] = row._count.id
      stats.total += row._count.id
    }

    return stats
  }

  async clearQueue(status?: QueueStatus): Promise<number> {
    const result = await prisma.agentQueue.deleteMany({
      where: status ? { status } : {},
    })
    return result.count
  }

  private async executeTask(taskId: string, agentId: string): Promise<void> {
    const execution = await prisma.agentExecution.create({
      data: {
        taskId,
        agentId,
        status: 'RUNNING',
        startedAt: new Date(),
      },
    })

    try {
      await prisma.executionLog.create({
        data: {
          executionId: execution.id,
          level: 'INFO',
          message: `Execução iniciada para tarefa ${taskId} com agente ${agentId}`,
        },
      })

      // TODO: integrar com lógica real de execução do agente

      await prisma.agentExecution.update({
        where: { id: execution.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          progress: 100,
        },
      })

      await prisma.executionLog.create({
        data: {
          executionId: execution.id,
          level: 'INFO',
          message: `Execução concluída com sucesso`,
        },
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)

      await prisma.agentExecution.update({
        where: { id: execution.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          error: errorMessage,
        },
      })

      await prisma.executionLog.create({
        data: {
          executionId: execution.id,
          level: 'ERROR',
          message: `Execução falhou: ${errorMessage}`,
        },
      })

      throw error
    }
  }
}

export const queueManager = new QueueManager()
export { QueueManager }
