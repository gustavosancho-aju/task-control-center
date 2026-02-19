import type { AgentCapability, ExecutionContext, ExecutionResult } from '../execution-engine'
import type { Task } from '@prisma/client'
import prisma from '@/lib/db'
import * as fs from 'fs'
import * as path from 'path'

export const deployToVercel: AgentCapability = {
  name: 'deployToVercel',
  description: 'Faz deploy de arquivos gerados no Vercel e retorna a URL pública',
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
      let generatedDir = ''

      if (task.orchestrationId) {
        const pixelExecution = await prisma.agentExecution.findFirst({
          where: {
            task: { orchestrationId: task.orchestrationId },
            agent: { role: 'PIXEL' },
            status: 'COMPLETED',
          },
          orderBy: { completedAt: 'desc' },
          select: { taskId: true },
        })

        if (pixelExecution?.taskId) {
          generatedDir = path.join(process.cwd(), 'public', 'generated', pixelExecution.taskId)
        }
      }

      if (!generatedDir || !fs.existsSync(generatedDir)) {
        await ctx.log('ERROR', 'Diretório de arquivos gerados não encontrado')
        return { success: false, error: 'Arquivos da landing page não encontrados. O PIXEL precisa ter gerado os arquivos primeiro.' }
      }

      await ctx.log('INFO', `Lendo arquivos de ${generatedDir}`)
      await ctx.updateProgress(25)

      // Ler arquivos para deploy
      const files: { file: string; data: string }[] = []
      const fileNames = ['index.html', 'style.css', 'script.js']

      for (const fileName of fileNames) {
        const filePath = path.join(generatedDir, fileName)
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8')
          files.push({
            file: fileName,
            data: Buffer.from(content).toString('base64'),
          })
          await ctx.log('INFO', `Arquivo ${fileName}: ${(content.length / 1024).toFixed(1)} KB`)
        }
      }

      if (files.length === 0) {
        return { success: false, error: 'Nenhum arquivo encontrado para deploy' }
      }

      await ctx.log('INFO', `${files.length} arquivo(s) preparados para deploy`)
      await ctx.updateProgress(40)

      // Gerar nome do projeto baseado no título da task
      const projectName = `lp-${task.id.slice(-8)}-${Date.now().toString(36)}`

      await ctx.log('INFO', `Criando deployment "${projectName}" no Vercel...`)
      await ctx.updateProgress(55)

      // Deploy via Vercel API
      const response = await fetch('https://api.vercel.com/v13/deployments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: projectName,
          files: files.map(f => ({
            file: f.file,
            data: f.data,
            encoding: 'base64',
          })),
          projectSettings: {
            framework: null,
          },
        }),
      })

      if (!response.ok) {
        const errorBody = await response.text()
        await ctx.log('ERROR', `Vercel API error: ${response.status} - ${errorBody}`)
        return { success: false, error: `Vercel deploy falhou: ${response.status} - ${errorBody}` }
      }

      const deployment = await response.json() as {
        id: string
        url: string
        readyState: string
      }

      await ctx.log('INFO', `Deployment criado: ${deployment.id}`)
      await ctx.updateProgress(70)

      // Aguardar deploy ficar READY (poll a cada 3s, max 60s)
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
        await ctx.log('WARNING', 'Deploy ainda em progresso após timeout, retornando URL mesmo assim')
      }

      await ctx.log('INFO', `Deploy concluído! URL: ${deployUrl}`)
      await ctx.updateProgress(95)

      const summary = `Landing page publicada com sucesso!

🌐 URL: ${deployUrl}
📦 Projeto: ${projectName}
📄 Arquivos: ${files.map(f => f.file).join(', ')}
⏱️ Deploy ID: ${deployment.id}
✅ Status: ${readyState}`

      return {
        success: true,
        result: summary,
        artifacts: [deployUrl],
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      await ctx.log('ERROR', `Falha no deploy: ${msg}`)
      return { success: false, error: msg }
    }
  },
}

export const finishCapabilities: AgentCapability[] = [
  deployToVercel,
]
