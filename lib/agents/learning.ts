import prisma from '@/lib/db'

// ============================================================================
// TYPES
// ============================================================================

export interface FeedbackInput {
  rating: number // 1-5
  wasAccepted: boolean
  comments?: string
  improvements?: string[]
}

export interface AgentPerformance {
  agentId: string
  agentName: string
  totalExecutions: number
  completedExecutions: number
  feedbackCount: number
  acceptanceRate: number
  averageRating: number
  commonImprovements: { improvement: string; count: number }[]
  recentFeedback: {
    rating: number
    wasAccepted: boolean
    comments: string | null
    taskTitle: string
    createdAt: Date
  }[]
}

// ============================================================================
// LEARNING MODULE
// ============================================================================

/**
 * Registra feedback para uma execução concluída.
 */
export async function recordFeedback(
  executionId: string,
  feedback: FeedbackInput
) {
  const execution = await prisma.agentExecution.findUnique({
    where: { id: executionId },
    include: { feedback: true },
  })

  if (!execution) {
    throw new Error(`Execução ${executionId} não encontrada`)
  }

  if (execution.status !== 'COMPLETED' && execution.status !== 'FAILED') {
    throw new Error('Só é possível dar feedback em execuções finalizadas')
  }

  if (execution.feedback) {
    // Atualiza feedback existente
    return prisma.executionFeedback.update({
      where: { id: execution.feedback.id },
      data: {
        rating: Math.max(1, Math.min(5, feedback.rating)),
        wasAccepted: feedback.wasAccepted,
        comments: feedback.comments ?? null,
        improvements: feedback.improvements ?? [],
      },
    })
  }

  return prisma.executionFeedback.create({
    data: {
      executionId,
      rating: Math.max(1, Math.min(5, feedback.rating)),
      wasAccepted: feedback.wasAccepted,
      comments: feedback.comments ?? null,
      improvements: feedback.improvements ?? [],
    },
  })
}

/**
 * Calcula métricas de performance de um agente com base no feedback recebido.
 */
export async function getAgentPerformance(
  agentId: string
): Promise<AgentPerformance> {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
  })

  if (!agent) {
    throw new Error(`Agente ${agentId} não encontrado`)
  }

  const executions = await prisma.agentExecution.findMany({
    where: { agentId },
    include: {
      feedback: true,
      task: { select: { title: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const completed = executions.filter((e) => e.status === 'COMPLETED')
  const withFeedback = executions.filter((e) => e.feedback !== null)

  // Taxa de aceitação
  const accepted = withFeedback.filter((e) => e.feedback!.wasAccepted)
  const acceptanceRate =
    withFeedback.length > 0 ? accepted.length / withFeedback.length : 0

  // Média de rating
  const totalRating = withFeedback.reduce(
    (sum, e) => sum + e.feedback!.rating,
    0
  )
  const averageRating =
    withFeedback.length > 0 ? totalRating / withFeedback.length : 0

  // Melhorias mais comuns
  const improvementCounts = new Map<string, number>()
  for (const exec of withFeedback) {
    for (const imp of exec.feedback!.improvements) {
      improvementCounts.set(imp, (improvementCounts.get(imp) ?? 0) + 1)
    }
  }
  const commonImprovements = Array.from(improvementCounts.entries())
    .map(([improvement, count]) => ({ improvement, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Feedback recente
  const recentFeedback = withFeedback.slice(0, 10).map((e) => ({
    rating: e.feedback!.rating,
    wasAccepted: e.feedback!.wasAccepted,
    comments: e.feedback!.comments,
    taskTitle: e.task.title,
    createdAt: e.feedback!.createdAt,
  }))

  return {
    agentId,
    agentName: agent.name,
    totalExecutions: executions.length,
    completedExecutions: completed.length,
    feedbackCount: withFeedback.length,
    acceptanceRate: Math.round(acceptanceRate * 100) / 100,
    averageRating: Math.round(averageRating * 100) / 100,
    commonImprovements,
    recentFeedback,
  }
}

/**
 * Gera um prompt de melhoria para o agente baseado no histórico de feedback.
 * Usado para enriquecer o contexto da próxima execução.
 */
export async function generateImprovementPrompt(
  agentId: string
): Promise<string | null> {
  const feedbackEntries = await prisma.executionFeedback.findMany({
    where: {
      execution: { agentId },
    },
    include: {
      execution: {
        include: {
          task: { select: { title: true, description: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  if (feedbackEntries.length === 0) return null

  const accepted = feedbackEntries.filter((f) => f.wasAccepted)
  const rejected = feedbackEntries.filter((f) => !f.wasAccepted)
  const avgRating =
    feedbackEntries.reduce((sum, f) => sum + f.rating, 0) /
    feedbackEntries.length

  // Coletar melhorias mais mencionadas
  const improvementCounts = new Map<string, number>()
  for (const f of feedbackEntries) {
    for (const imp of f.improvements) {
      improvementCounts.set(imp, (improvementCounts.get(imp) ?? 0) + 1)
    }
  }
  const topImprovements = Array.from(improvementCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  // Coletar comentários de rejeições recentes
  const recentRejectionComments = rejected
    .slice(0, 5)
    .filter((f) => f.comments)
    .map(
      (f) =>
        `- Tarefa "${f.execution.task.title}": ${f.comments}`
    )

  // Montar prompt de melhoria
  const sections: string[] = []

  sections.push(
    `## Histórico de Performance\n` +
      `- Total de feedbacks: ${feedbackEntries.length}\n` +
      `- Taxa de aceitação: ${Math.round((accepted.length / feedbackEntries.length) * 100)}%\n` +
      `- Nota média: ${avgRating.toFixed(1)}/5`
  )

  if (topImprovements.length > 0) {
    sections.push(
      `## Áreas de Melhoria Mais Mencionadas\n` +
        topImprovements
          .map(([imp, count]) => `- ${imp} (mencionado ${count}x)`)
          .join('\n')
    )
  }

  if (recentRejectionComments.length > 0) {
    sections.push(
      `## Feedback de Execuções Rejeitadas Recentes\n` +
        recentRejectionComments.join('\n')
    )
  }

  // Adicionar exemplos de execuções bem-sucedidas
  const bestExecutions = accepted
    .filter((f) => f.rating >= 4)
    .slice(0, 3)
  if (bestExecutions.length > 0) {
    sections.push(
      `## Exemplos de Execuções Bem Avaliadas\n` +
        bestExecutions
          .map(
            (f) =>
              `- Tarefa "${f.execution.task.title}" (nota ${f.rating}/5)`
          )
          .join('\n')
    )
  }

  return (
    `\n\n---\n# Contexto de Aprendizado\n\n` +
    `Use as informações abaixo para melhorar sua resposta com base no feedback anterior:\n\n` +
    sections.join('\n\n')
  )
}
