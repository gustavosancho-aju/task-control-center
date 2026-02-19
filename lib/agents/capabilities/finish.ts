import { createClaudeMessage, CLAUDE_MODELS } from '@/lib/ai/claude-client'
import type { AgentCapability, ExecutionContext, ExecutionResult } from '../execution-engine'
import type { Task } from '@prisma/client'
import prisma from '@/lib/db'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Verifica se a orquestração tem arquivos de landing page gerados pelo PIXEL
 */
async function hasPixelFiles(task: Task): Promise<boolean> {
  if (!task.orchestrationId) return false

  const pixelExecution = await prisma.agentExecution.findFirst({
    where: {
      task: { orchestrationId: task.orchestrationId },
      agent: { role: 'PIXEL' },
      status: 'COMPLETED',
    },
    select: { taskId: true, metadata: true },
  })

  if (!pixelExecution) return false

  // Verifica arquivos no DB (produção)
  const meta = pixelExecution.metadata as Record<string, Record<string, string>> | null
  if (meta?.files?.['index.html']) return true

  // Verifica filesystem local (dev)
  const dir = path.join(process.cwd(), 'public', 'generated', pixelExecution.taskId)
  return fs.existsSync(dir)
}

export const deployToVercel: AgentCapability = {
  name: 'deployToVercel',
  description: 'Faz deploy de arquivos de landing page gerados pelo PIXEL no Vercel',
  condition: (task: Task) => hasPixelFiles(task),
  async execute(task: Task, ctx: ExecutionContext): Promise<ExecutionResult> {
    await ctx.log('INFO', 'Iniciando deploy no Vercel')
    await ctx.updateProgress(10)

    const token = process.env.VERCEL_DEPLOY_TOKEN
    if (!token) {
      await ctx.log('ERROR', 'VERCEL_DEPLOY_TOKEN não configurado no .env')
      return { success: false, error: 'VERCEL_DEPLOY_TOKEN não configurado. Adicione ao .env para habilitar deploy.' }
    }

    try {
      // Encontrar arquivos gerados pelo PIXEL na mesma orquestração
      const pixelExecution = await prisma.agentExecution.findFirst({
        where: {
          task: { orchestrationId: task.orchestrationId! },
          agent: { role: 'PIXEL' },
          status: 'COMPLETED',
        },
        orderBy: { completedAt: 'desc' },
        select: { taskId: true, metadata: true },
      })

      const files: { file: string; data: string }[] = []
      const fileNames = ['index.html', 'style.css', 'script.js']

      // 1. Tenta ler do DB (produção)
      const meta = pixelExecution?.metadata as Record<string, Record<string, string>> | null
      if (meta?.files) {
        for (const fileName of fileNames) {
          const content = meta.files[fileName]
          if (content) {
            files.push({ file: fileName, data: Buffer.from(content).toString('base64') })
            await ctx.log('INFO', `[DB] ${fileName}: ${(content.length / 1024).toFixed(1)} KB`)
          }
        }
      }

      // 2. Fallback: filesystem local (dev)
      if (files.length === 0 && pixelExecution?.taskId) {
        const generatedDir = path.join(process.cwd(), 'public', 'generated', pixelExecution.taskId)
        for (const fileName of fileNames) {
          const filePath = path.join(generatedDir, fileName)
          if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf-8')
            files.push({ file: fileName, data: Buffer.from(content).toString('base64') })
            await ctx.log('INFO', `[FS] ${fileName}: ${(content.length / 1024).toFixed(1)} KB`)
          }
        }
      }

      if (files.length === 0) {
        return { success: false, error: 'Nenhum arquivo encontrado para deploy' }
      }

      await ctx.log('INFO', `${files.length} arquivo(s) preparados para deploy`)
      await ctx.updateProgress(40)

      const projectName = `lp-${task.id.slice(-8)}-${Date.now().toString(36)}`
      await ctx.log('INFO', `Criando deployment "${projectName}" no Vercel...`)
      await ctx.updateProgress(55)

      const response = await fetch('https://api.vercel.com/v13/deployments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: projectName,
          files: files.map(f => ({ file: f.file, data: f.data, encoding: 'base64' })),
          projectSettings: { framework: null },
        }),
      })

      if (!response.ok) {
        const errorBody = await response.text()
        await ctx.log('ERROR', `Vercel API error: ${response.status} - ${errorBody}`)
        return { success: false, error: `Vercel deploy falhou: ${response.status} - ${errorBody}` }
      }

      const deployment = await response.json() as { id: string; url: string; readyState: string }
      await ctx.log('INFO', `Deployment criado: ${deployment.id}`)
      await ctx.updateProgress(70)

      const deployUrl = `https://${deployment.url}`
      let readyState = deployment.readyState
      let attempts = 0

      while (readyState !== 'READY' && attempts < 20) {
        await new Promise(resolve => setTimeout(resolve, 3000))
        attempts++

        const statusRes = await fetch(`https://api.vercel.com/v13/deployments/${deployment.id}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        })

        if (statusRes.ok) {
          const status = await statusRes.json() as { readyState: string }
          readyState = status.readyState
          await ctx.updateProgress(70 + Math.min(attempts * 1.5, 25))

          if (readyState === 'ERROR') {
            return { success: false, error: 'Deploy falhou no Vercel. Verifique os logs no dashboard.' }
          }
        }
      }

      if (readyState !== 'READY') {
        await ctx.log('WARNING', 'Deploy ainda em progresso após timeout')
      }

      await ctx.log('INFO', `Deploy concluído! URL: ${deployUrl}`)
      await ctx.updateProgress(95)

      return {
        success: true,
        result: `Landing page publicada!\n\n🌐 URL: ${deployUrl}\n📦 Projeto: ${projectName}\n📄 Arquivos: ${files.map(f => f.file).join(', ')}\n⏱️ Deploy ID: ${deployment.id}\n✅ Status: ${readyState}`,
        artifacts: [deployUrl],
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      await ctx.log('ERROR', `Falha no deploy: ${msg}`)
      return { success: false, error: msg }
    }
  },
}

/**
 * Fallback para tarefas de "deploy" ou "finalização" que não envolvem landing pages.
 * Gera um relatório de conclusão baseado na orquestração.
 */
export const summarizeProject: AgentCapability = {
  name: 'summarizeProject',
  description: 'Gera relatório de conclusão para projetos sem landing page (CRM, APIs, etc.)',
  condition: async (task: Task) => {
    // Só executa se NÃO houver arquivos PIXEL (é o fallback de deployToVercel)
    const hasFiles = await hasPixelFiles(task)
    return !hasFiles
  },
  async execute(task: Task, ctx: ExecutionContext): Promise<ExecutionResult> {
    await ctx.log('INFO', 'Gerando relatório de conclusão do projeto')
    await ctx.updateProgress(20)

    try {
      // Busca resumo das execuções da orquestração
      let contextSummary = `Tarefa: ${task.title}\nDescrição: ${task.description || 'N/A'}`

      if (task.orchestrationId) {
        const subtasks = await prisma.task.findMany({
          where: { orchestrationId: task.orchestrationId, status: 'DONE' },
          select: { title: true, agent: { select: { role: true } } },
        })
        if (subtasks.length > 0) {
          contextSummary += `\n\nSubtarefas concluídas (${subtasks.length}):\n`
          contextSummary += subtasks.map(t => `- [${t.agent?.role}] ${t.title}`).join('\n')
        }
      }

      const prompt = `Você é o FINISH, agente de finalização de projetos. Gere um relatório de conclusão conciso para:

${contextSummary}

O relatório deve incluir:
1. Resumo do que foi entregue
2. Status final do projeto
3. Próximos passos recomendados (se houver)

Seja direto e objetivo (máx. 200 palavras).`

      await ctx.updateProgress(50)
      const report = await createClaudeMessage(prompt, undefined, { model: CLAUDE_MODELS.haiku, maxTokens: 512 })

      await ctx.log('INFO', 'Relatório de conclusão gerado')
      await ctx.updateProgress(95)

      return {
        success: true,
        result: `## Relatório de Conclusão\n\n${report}`,
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      await ctx.log('ERROR', `Falha ao gerar relatório: ${msg}`)
      return { success: false, error: msg }
    }
  },
}

export const finishCapabilities: AgentCapability[] = [
  deployToVercel,
  summarizeProject,
]
