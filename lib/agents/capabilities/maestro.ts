import { createClaudeMessage } from '@/lib/ai/claude-client'
import type { AgentCapability, ExecutionContext, ExecutionResult } from '../execution-engine'
import type { Task } from '@prisma/client'

const SYSTEM_PROMPT = `Você é o MAESTRO, agente orquestrador do sistema Synkra AIOS.
Sua especialidade é planejamento, coordenação e gestão de projetos de desenvolvimento.
Sempre responda de forma estruturada e acionável.`

export const analyzeAndDecompose: AgentCapability = {
  name: 'analyzeAndDecompose',
  description: 'Analisa tarefa complexa e decompõe em subtarefas menores e gerenciáveis',
  async execute(task: Task, ctx: ExecutionContext): Promise<ExecutionResult> {
    await ctx.log('INFO', 'Iniciando análise e decomposição da tarefa')
    await ctx.updateProgress(15)

    try {
      const prompt = `Analise a seguinte tarefa e decomponha em subtarefas:

**Título:** ${task.title}
**Descrição:** ${task.description || 'Sem descrição'}
**Prioridade:** ${task.priority}

Forneça:
1. Análise de complexidade e escopo
2. Lista de subtarefas (máximo 6) com título, descrição, prioridade estimada e horas
3. Dependências entre subtarefas
4. Riscos identificados
5. Ordem de execução recomendada`

      const result = await createClaudeMessage(prompt, SYSTEM_PROMPT)
      await ctx.log('INFO', 'Decomposição concluída', { subtaskCount: (result.match(/^\d+\./gm) || []).length })
      return { success: true, result }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      await ctx.log('ERROR', `Falha na decomposição: ${msg}`)
      return { success: false, error: msg }
    }
  },
}

export const assignToAgents: AgentCapability = {
  name: 'assignToAgents',
  description: 'Distribui subtarefas para os agentes mais apropriados',
  async execute(task: Task, ctx: ExecutionContext): Promise<ExecutionResult> {
    await ctx.log('INFO', 'Iniciando atribuição de agentes')
    await ctx.updateProgress(15)

    try {
      const prompt = `Para a seguinte tarefa, sugira a distribuição ideal entre os agentes disponíveis:

**Tarefa:** ${task.title}
**Descrição:** ${task.description || 'Sem descrição'}

Agentes disponíveis:
- MAESTRO: Orquestração e planejamento
- SENTINEL: Qualidade, testes e segurança
- ARCHITECTON: Arquitetura e infraestrutura
- PIXEL: UI/UX e design

Para cada aspecto da tarefa, indique:
1. Qual agente é o mais adequado e por quê
2. Qual a prioridade de cada atribuição
3. Dependências entre os trabalhos dos agentes
4. Pontos de sincronização necessários`

      const result = await createClaudeMessage(prompt, SYSTEM_PROMPT)
      await ctx.log('INFO', 'Atribuição de agentes concluída')
      return { success: true, result }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      await ctx.log('ERROR', `Falha na atribuição: ${msg}`)
      return { success: false, error: msg }
    }
  },
}

export const coordinateExecution: AgentCapability = {
  name: 'coordinateExecution',
  description: 'Coordena a execução de múltiplas tarefas e gerencia dependências',
  async execute(task: Task, ctx: ExecutionContext): Promise<ExecutionResult> {
    await ctx.log('INFO', 'Iniciando coordenação de execução')
    await ctx.updateProgress(15)

    try {
      const prompt = `Crie um plano de coordenação para a seguinte tarefa:

**Tarefa:** ${task.title}
**Descrição:** ${task.description || 'Sem descrição'}
**Status atual:** ${task.status}

Forneça:
1. Cronograma de execução com marcos (milestones)
2. Pontos de verificação (checkpoints) e critérios de aprovação
3. Plano de comunicação entre agentes
4. Estratégia de resolução de conflitos
5. Critérios de conclusão (definition of done)
6. Plano de contingência para bloqueios`

      const result = await createClaudeMessage(prompt, SYSTEM_PROMPT)
      await ctx.log('INFO', 'Plano de coordenação criado')
      return { success: true, result }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      await ctx.log('ERROR', `Falha na coordenação: ${msg}`)
      return { success: false, error: msg }
    }
  },
}

export const generateReport: AgentCapability = {
  name: 'generateReport',
  description: 'Gera relatório de progresso e status do projeto',
  async execute(task: Task, ctx: ExecutionContext): Promise<ExecutionResult> {
    await ctx.log('INFO', 'Gerando relatório de progresso')
    await ctx.updateProgress(15)

    try {
      const prompt = `Gere um relatório de progresso para a seguinte tarefa:

**Tarefa:** ${task.title}
**Descrição:** ${task.description || 'Sem descrição'}
**Status:** ${task.status}
**Prioridade:** ${task.priority}
**Criada em:** ${task.createdAt.toISOString()}
**Horas estimadas:** ${task.estimatedHours ?? 'Não estimado'}
**Horas reais:** ${task.actualHours ?? 'Não registrado'}

Gere um relatório contendo:
1. Resumo executivo
2. Status atual e progresso estimado
3. Métricas (prazo, esforço, qualidade)
4. Riscos e impedimentos identificados
5. Próximos passos recomendados
6. Conclusão com recomendação de ação`

      const result = await createClaudeMessage(prompt, SYSTEM_PROMPT)
      await ctx.log('INFO', 'Relatório gerado com sucesso')
      return { success: true, result, artifacts: ['report.md'] }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      await ctx.log('ERROR', `Falha ao gerar relatório: ${msg}`)
      return { success: false, error: msg }
    }
  },
}

export const maestroCapabilities: AgentCapability[] = [
  analyzeAndDecompose,
  assignToAgents,
  coordinateExecution,
  generateReport,
]
