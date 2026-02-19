import { createClaudeMessage } from '@/lib/ai/claude-client'
import type { AgentCapability, ExecutionContext, ExecutionResult } from '../execution-engine'
import type { Task } from '@prisma/client'

const SYSTEM_PROMPT = `Você é o ARCHITECTON, arquiteto de sistemas do Synkra AIOS.
Sua especialidade é arquitetura de software, design de sistemas, banco de dados e infraestrutura.
Forneça soluções robustas, escaláveis e bem fundamentadas.`

export const designSystem: AgentCapability = {
  name: 'designSystem',
  description: 'Projeta arquitetura do sistema com diagramas e decisões técnicas',
  async execute(task: Task, ctx: ExecutionContext): Promise<ExecutionResult> {
    await ctx.log('INFO', 'Iniciando design de arquitetura')
    await ctx.updateProgress(15)

    try {
      const prompt = `Projete a arquitetura para a seguinte tarefa:

**Tarefa:** ${task.title}
**Descrição:** ${task.description || 'Sem descrição'}

Forneça:
1. **Visão geral:** Diagrama conceitual da arquitetura (em texto/ASCII)
2. **Componentes:** Lista de módulos, serviços e suas responsabilidades
3. **Comunicação:** Como os componentes se comunicam (REST, eventos, filas)
4. **Dados:** Fluxo de dados entre componentes
5. **Padrões:** Design patterns aplicados e justificativa
6. **Escalabilidade:** Como a solução escala horizontal e verticalmente
7. **Trade-offs:** Decisões tomadas e alternativas consideradas`

      const result = await createClaudeMessage(prompt, SYSTEM_PROMPT)
      await ctx.log('INFO', 'Design de arquitetura concluído')
      return { success: true, result, artifacts: ['architecture.md'] }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      await ctx.log('ERROR', `Falha no design: ${msg}`)
      return { success: false, error: msg }
    }
  },
}

export const createSchema: AgentCapability = {
  name: 'createSchema',
  description: 'Cria schemas de banco de dados com modelos, relações e índices',
  async execute(task: Task, ctx: ExecutionContext): Promise<ExecutionResult> {
    await ctx.log('INFO', 'Iniciando criação de schema')
    await ctx.updateProgress(15)

    try {
      const prompt = `Crie um schema de banco de dados para a seguinte tarefa:

**Tarefa:** ${task.title}
**Descrição:** ${task.description || 'Sem descrição'}

Forneça usando formato Prisma Schema:
1. **Modelos:** Entidades com campos, tipos e constraints
2. **Relações:** One-to-one, one-to-many, many-to-many
3. **Índices:** Para otimização de queries frequentes
4. **Enums:** Tipos enumerados necessários
5. **Validações:** Constraints de integridade
6. **Migrações:** Plano de migração se houver schema existente
7. **Queries comuns:** Exemplos das queries mais frequentes`

      const result = await createClaudeMessage(prompt, SYSTEM_PROMPT)
      await ctx.log('INFO', 'Schema criado com sucesso')
      return { success: true, result, artifacts: ['schema.prisma'] }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      await ctx.log('ERROR', `Falha na criação do schema: ${msg}`)
      return { success: false, error: msg }
    }
  },
}

export const documentArchitecture: AgentCapability = {
  name: 'documentArchitecture',
  description: 'Documenta decisões arquiteturais e rationale técnico (ADR)',
  async execute(task: Task, ctx: ExecutionContext): Promise<ExecutionResult> {
    await ctx.log('INFO', 'Iniciando documentação arquitetural')
    await ctx.updateProgress(15)

    try {
      const prompt = `Documente as decisões arquiteturais para a seguinte tarefa:

**Tarefa:** ${task.title}
**Descrição:** ${task.description || 'Sem descrição'}

Crie um ADR (Architecture Decision Record) contendo:
1. **Título:** Decisão clara e concisa
2. **Status:** Proposta / Aceita / Deprecada
3. **Contexto:** Situação e problema que motivou a decisão
4. **Decisão:** O que foi decidido
5. **Alternativas consideradas:** Opções avaliadas com prós e contras
6. **Consequências:** Impactos positivos e negativos da decisão
7. **Compliance:** Requisitos de conformidade atendidos`

      const result = await createClaudeMessage(prompt, SYSTEM_PROMPT)
      await ctx.log('INFO', 'Documentação arquitetural concluída')
      return { success: true, result, artifacts: ['adr.md'] }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      await ctx.log('ERROR', `Falha na documentação: ${msg}`)
      return { success: false, error: msg }
    }
  },
}

export const evaluateTechStack: AgentCapability = {
  name: 'evaluateTechStack',
  description: 'Avalia e recomenda tecnologias para o projeto',
  async execute(task: Task, ctx: ExecutionContext): Promise<ExecutionResult> {
    await ctx.log('INFO', 'Iniciando avaliação de tech stack')
    await ctx.updateProgress(15)

    try {
      const prompt = `Avalie o tech stack ideal para a seguinte tarefa:

**Tarefa:** ${task.title}
**Descrição:** ${task.description || 'Sem descrição'}

Analise e recomende:
1. **Frontend:** Framework, state management, styling
2. **Backend:** Runtime, framework, ORM
3. **Banco de dados:** Relacional vs NoSQL, opções específicas
4. **Infraestrutura:** Cloud, containers, CI/CD
5. **Ferramentas:** Dev tools, monitoring, logging

Para cada recomendação:
- Justificativa técnica
- Prós e contras
- Alternativas viáveis
- Curva de aprendizado da equipe
- Custo estimado (quando aplicável)
- Maturidade e suporte da comunidade`

      const result = await createClaudeMessage(prompt, SYSTEM_PROMPT)
      await ctx.log('INFO', 'Avaliação de tech stack concluída')
      return { success: true, result, artifacts: ['tech-evaluation.md'] }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      await ctx.log('ERROR', `Falha na avaliação: ${msg}`)
      return { success: false, error: msg }
    }
  },
}

export const planLandingPage: AgentCapability = {
  name: 'planLandingPage',
  description: 'Cria plano arquitetural completo para landing page com seções, paleta, fontes e CTAs',
  async execute(task: Task, ctx: ExecutionContext): Promise<ExecutionResult> {
    await ctx.log('INFO', 'Iniciando planejamento de landing page')
    await ctx.updateProgress(10)

    try {
      const prompt = `Crie um plano técnico DETALHADO para uma landing page baseada neste briefing:

**Tarefa:** ${task.title}
**Briefing:** ${task.description || 'Landing page institucional'}

Defina com PRECISÃO (os valores serão usados diretamente no código):

1. **Estrutura de seções** (em ordem): liste cada seção com seu propósito
2. **Paleta de cores exata** (hex codes): primary, secondary, accent, background, text
3. **Fontes Google** (títulos e corpo): nomes exatos das fontes
4. **Headline principal** (máx 8 palavras) e subtítulo (2 linhas)
5. **Textos dos CTAs** (botões de ação)
6. **Tom de voz**: profissional, casual, premium, etc.
7. **Elementos obrigatórios**: hero com gradient, cards de serviços, depoimentos, FAQ, formulário de contato, botão WhatsApp fixo
8. **Stack técnica**: HTML5 semântico + CSS3 puro + JS vanilla (sem frameworks)

Seja ESPECÍFICO com cores, textos e fontes — eles serão usados diretamente no código gerado.`

      const result = await createClaudeMessage(prompt, SYSTEM_PROMPT)
      await ctx.log('INFO', 'Plano de landing page concluído')
      await ctx.updateProgress(90)
      return { success: true, result, artifacts: ['landing-page-plan.md'] }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      await ctx.log('ERROR', `Falha no planejamento: ${msg}`)
      return { success: false, error: msg }
    }
  },
}

export const architectonCapabilities: AgentCapability[] = [
  planLandingPage,
  designSystem,
  createSchema,
  documentArchitecture,
  evaluateTechStack,
]
