import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function cleanup() {
  console.log('🧹 Iniciando limpeza do banco de dados...\n')

  // 1. Logs de execução (filho de AgentExecution)
  const execLogs = await prisma.executionLog.deleteMany()
  console.log(`✓ ExecutionLog:      ${execLogs.count} deletados`)

  // 2. Feedback de execução (filho de AgentExecution)
  const execFeedback = await prisma.executionFeedback.deleteMany()
  console.log(`✓ ExecutionFeedback: ${execFeedback.count} deletados`)

  // 3. Execuções de agentes
  const executions = await prisma.agentExecution.deleteMany()
  console.log(`✓ AgentExecution:    ${executions.count} deletados`)

  // 4. Fila de agentes
  const queue = await prisma.agentQueue.deleteMany()
  console.log(`✓ AgentQueue:        ${queue.count} deletados`)

  // 5. Comentários (replies primeiro, depois pais — via parentId)
  await prisma.comment.deleteMany({ where: { parentId: { not: null } } })
  const comments = await prisma.comment.deleteMany()
  console.log(`✓ Comment:           ${comments.count} deletados`)

  // 6. Anexos
  const attachments = await prisma.attachment.deleteMany()
  console.log(`✓ Attachment:        ${attachments.count} deletados`)

  // 7. Histórico de status
  const statusHistory = await prisma.statusChange.deleteMany()
  console.log(`✓ StatusChange:      ${statusHistory.count} deletados`)

  // 8. Quebrar relação pai-filho entre tarefas (subtarefas)
  await prisma.task.updateMany({ where: { parentId: { not: null } }, data: { parentId: null } })

  // 9. Tarefas (relação tag many-to-many é limpa automaticamente pelo Prisma)
  const tasks = await prisma.task.deleteMany()
  console.log(`✓ Task:              ${tasks.count} deletados`)

  // 10. Tags órfãs
  const tags = await prisma.tag.deleteMany()
  console.log(`✓ Tag:               ${tags.count} deletados`)

  // 11. Logs de auditoria
  const audit = await prisma.auditLog.deleteMany()
  console.log(`✓ AuditLog:          ${audit.count} deletados`)

  console.log('\n✅ Limpeza concluída! Sistema zerado.')
  console.log('   Agentes, Templates e Settings foram preservados.\n')
}

cleanup()
  .catch((e) => {
    console.error('❌ Erro na limpeza:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
