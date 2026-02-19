/**
 * local-processor.ts
 *
 * Processador local de tarefas que usa Claude Code CLI em vez da API Anthropic.
 * Consume a assinatura Claude.ai do usuário (sem custo de API).
 *
 * Uso:
 *   npm run processor
 *
 * Variáveis de ambiente:
 *   PROCESSOR_INTERVAL=15   # segundos entre cada ciclo (padrão: 15)
 *   PROCESSOR_CONCURRENCY=2 # tarefas simultâneas (padrão: 2)
 */

// IMPORTANTE: definir ANTES de qualquer import — createClaudeMessage
// checa process.env em runtime (não import-time), então funciona corretamente
process.env.USE_CLAUDE_CODE = 'true'

import { config } from 'dotenv'
config() // carrega .env

import { PrismaClient } from '@prisma/client'
import { executionEngine } from '../lib/agents/execution-engine'
import { registerAllCapabilities } from '../lib/agents/capabilities'
import { spawnSync } from 'child_process'

// ============================================================================
// CONFIG
// ============================================================================

const INTERVAL_SEC = parseInt(process.env.PROCESSOR_INTERVAL ?? '15', 10)
const CONCURRENCY  = parseInt(process.env.PROCESSOR_CONCURRENCY ?? '2', 10)
const prisma = new PrismaClient()

// ============================================================================
// HELPERS
// ============================================================================

function checkClaudeCLI(): boolean {
  const result = spawnSync('claude', ['--version'], { encoding: 'utf-8', timeout: 5000 })
  if (result.error || result.status !== 0) {
    console.error('❌ Claude Code CLI não encontrado.')
    console.error('   Instale com: npm install -g @anthropic-ai/claude-code')
    console.error('   Depois faça login: claude login')
    return false
  }
  console.log(`✅ Claude Code CLI: ${result.stdout.trim()}`)
  return true
}

function timestamp(): string {
  return new Date().toISOString().slice(11, 19)
}

// ============================================================================
// PROCESSOR TICK
// ============================================================================

let processing = false
let cycleCount  = 0
let totalDone   = 0
let totalErrors = 0

async function tick(): Promise<void> {
  if (processing) return
  processing = true
  cycleCount++

  try {
    // Busca itens PENDING na fila (sem include — AgentQueue não tem relações)
    const pending = await prisma.agentQueue.findMany({
      where: { status: 'PENDING' },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      take: CONCURRENCY,
    })

    if (pending.length === 0) {
      process.stdout.write(`\r[${timestamp()}] Aguardando tarefas... (ciclo #${cycleCount})  `)
      return
    }

    // Busca títulos das tasks para log (query separada — sem FK em AgentQueue)
    const taskIds = pending.map(p => p.taskId)
    const tasks = await prisma.task.findMany({
      where: { id: { in: taskIds } },
      select: { id: true, title: true },
    })
    const taskTitleMap = new Map(tasks.map(t => [t.id, t.title ?? t.id]))

    const agents = await prisma.agent.findMany({
      where: { id: { in: pending.map(p => p.agentId) } },
      select: { id: true, role: true },
    })
    const agentRoleMap = new Map(agents.map(a => [a.id, a.role]))

    console.log(`\n[${timestamp()}] 🔄 ${pending.length} tarefa(s) encontrada(s)`)

    // Processa em paralelo (até CONCURRENCY simultâneos)
    await Promise.all(pending.map(async (entry) => {
      const title = taskTitleMap.get(entry.taskId) ?? entry.taskId
      const role  = agentRoleMap.get(entry.agentId) ?? entry.agentId
      const label = `[${role}] ${String(title).slice(0, 40)}`

      try {
        // Marca como PROCESSING
        await prisma.agentQueue.update({
          where: { id: entry.id },
          data: { status: 'PROCESSING', attempts: { increment: 1 } },
        })

        console.log(`[${timestamp()}] ▶ ${label}`)
        const result = await executionEngine.executeTask(entry.taskId, entry.agentId)

        if (result.success) {
          await prisma.agentQueue.update({
            where: { id: entry.id },
            data: { status: 'COMPLETED' },
          })
          totalDone++
          console.log(`[${timestamp()}] ✅ ${label}`)
        } else {
          const attempts = (entry.attempts ?? 0) + 1
          const exhausted = attempts >= (entry.maxAttempts ?? 3)
          await prisma.agentQueue.update({
            where: { id: entry.id },
            data: { status: exhausted ? 'FAILED' : 'PENDING' },
          })
          totalErrors++
          console.warn(`[${timestamp()}] ❌ ${label} — ${(result.error ?? '').slice(0, 80)}`)
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        await prisma.agentQueue.update({
          where: { id: entry.id },
          data: { status: 'PENDING' },
        }).catch(() => {})
        totalErrors++
        console.error(`[${timestamp()}] 💥 ${label} — ${msg.slice(0, 100)}`)
      }
    }))

    console.log(`[${timestamp()}] 📊 Total: ${totalDone} ✅ | ${totalErrors} ❌`)

  } finally {
    processing = false
  }
}

// ============================================================================
// MAIN
// ============================================================================

let timer: ReturnType<typeof setInterval>

async function main(): Promise<void> {
  console.log('╔══════════════════════════════════════════╗')
  console.log('║   Task Control Center — Local Processor  ║')
  console.log('║   Modo: Claude Code CLI (sem API key)    ║')
  console.log('╚══════════════════════════════════════════╝')
  console.log(`Intervalo: ${INTERVAL_SEC}s | Concorrência: ${CONCURRENCY}`)
  console.log()

  // Verifica se claude CLI está disponível
  if (!checkClaudeCLI()) process.exit(1)

  // Registra capabilities dos agentes
  registerAllCapabilities()
  console.log('✅ Capabilities registradas')

  // Verifica conexão com DB
  await prisma.$connect()
  console.log('✅ Banco de dados conectado\n')

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n\n[Processor] Encerrando...')
    clearInterval(timer)
    await prisma.$disconnect()
    console.log(`[Processor] Finalizado. ${totalDone} tarefas processadas, ${totalErrors} erros.`)
    process.exit(0)
  })

  // Executa imediatamente e depois a cada INTERVAL_SEC
  await tick()
  timer = setInterval(tick, INTERVAL_SEC * 1000)
}

main().catch((err) => {
  console.error('Falha fatal:', err)
  process.exit(1)
})
