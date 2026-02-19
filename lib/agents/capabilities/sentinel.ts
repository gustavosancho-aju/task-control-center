import { createClaudeMessage, CLAUDE_MODELS } from '@/lib/ai/claude-client'
import type { AgentCapability, ExecutionContext, ExecutionResult } from '../execution-engine'
import type { Task } from '@prisma/client'
import prisma from '@/lib/db'
import * as fs from 'fs'
import * as path from 'path'

const SYSTEM_PROMPT = `Você é o SENTINEL, guardião da qualidade do sistema Synkra AIOS.
Sua especialidade é code review, testes, segurança e garantia de qualidade.
Seja rigoroso, detalhista e forneça feedback acionável.`

export const reviewCode: AgentCapability = {
  name: 'reviewCode',
  description: 'Analisa código e sugere melhorias de qualidade, padrões e boas práticas',
  async execute(task: Task, ctx: ExecutionContext): Promise<ExecutionResult> {
    await ctx.log('INFO', 'Iniciando revisão de código')
    await ctx.updateProgress(15)

    try {
      const prompt = `Realize uma revisão de código para a seguinte tarefa:

**Tarefa:** ${task.title}
**Descrição:** ${task.description || 'Sem descrição'}

Analise e forneça:
1. **Padrões de código:** Consistência, naming conventions, organização
2. **Boas práticas:** SOLID, DRY, KISS aplicados
3. **Tratamento de erros:** Robustez e cobertura de edge cases
4. **Performance:** Possíveis gargalos e otimizações
5. **Manutenibilidade:** Legibilidade, documentação, complexidade
6. **Sugestões de melhoria:** Ações específicas priorizadas por impacto

Classifique cada item encontrado como: CRITICAL, HIGH, MEDIUM, LOW`

      const result = await createClaudeMessage(prompt, SYSTEM_PROMPT, { model: CLAUDE_MODELS.haiku, maxTokens: 2048 })
      await ctx.log('INFO', 'Revisão de código concluída')
      return { success: true, result, artifacts: ['code-review.md'] }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      await ctx.log('ERROR', `Falha na revisão: ${msg}`)
      return { success: false, error: msg }
    }
  },
}

export const runTests: AgentCapability = {
  name: 'runTests',
  description: 'Define e executa testes conceituais para validar a implementação',
  async execute(task: Task, ctx: ExecutionContext): Promise<ExecutionResult> {
    await ctx.log('INFO', 'Iniciando definição de testes')
    await ctx.updateProgress(15)

    try {
      const prompt = `Defina uma estratégia de testes para a seguinte tarefa:

**Tarefa:** ${task.title}
**Descrição:** ${task.description || 'Sem descrição'}

Forneça:
1. **Testes unitários:** Casos de teste para cada função/componente
2. **Testes de integração:** Fluxos entre módulos
3. **Testes E2E:** Cenários do usuário final
4. **Edge cases:** Casos limite e cenários de erro
5. **Cobertura esperada:** Métricas mínimas recomendadas

Para cada teste, inclua:
- Nome descritivo
- Pré-condições (Given)
- Ação (When)
- Resultado esperado (Then)`

      const result = await createClaudeMessage(prompt, SYSTEM_PROMPT, { model: CLAUDE_MODELS.haiku, maxTokens: 2048 })
      await ctx.log('INFO', 'Estratégia de testes definida')
      return { success: true, result, artifacts: ['test-plan.md'] }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      await ctx.log('ERROR', `Falha na definição de testes: ${msg}`)
      return { success: false, error: msg }
    }
  },
}

export const checkQuality: AgentCapability = {
  name: 'checkQuality',
  description: 'Verifica qualidade geral da entrega contra critérios de aceitação',
  async execute(task: Task, ctx: ExecutionContext): Promise<ExecutionResult> {
    await ctx.log('INFO', 'Iniciando verificação de qualidade')
    await ctx.updateProgress(15)

    try {
      const prompt = `Realize uma verificação de qualidade para a seguinte tarefa:

**Tarefa:** ${task.title}
**Descrição:** ${task.description || 'Sem descrição'}
**Status:** ${task.status}
**Prioridade:** ${task.priority}

Verifique:
1. **Completude:** Todos os requisitos foram atendidos?
2. **Consistência:** A implementação é coerente com o projeto?
3. **Usabilidade:** A solução é intuitiva e acessível?
4. **Documentação:** Está adequadamente documentada?
5. **Testabilidade:** É facilmente testável?
6. **Manutenibilidade:** Será fácil manter e evoluir?

Forneça um veredito: PASS, CONCERNS ou FAIL com justificativa.`

      const result = await createClaudeMessage(prompt, SYSTEM_PROMPT, { model: CLAUDE_MODELS.haiku, maxTokens: 2048 })
      await ctx.log('INFO', 'Verificação de qualidade concluída')
      return { success: true, result, artifacts: ['quality-report.md'] }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      await ctx.log('ERROR', `Falha na verificação: ${msg}`)
      return { success: false, error: msg }
    }
  },
}

export const securityAudit: AgentCapability = {
  name: 'securityAudit',
  description: 'Analisa vulnerabilidades de segurança e recomenda mitigações',
  async execute(task: Task, ctx: ExecutionContext): Promise<ExecutionResult> {
    await ctx.log('INFO', 'Iniciando auditoria de segurança')
    await ctx.updateProgress(15)

    try {
      const prompt = `Realize uma auditoria de segurança para a seguinte tarefa:

**Tarefa:** ${task.title}
**Descrição:** ${task.description || 'Sem descrição'}

Analise com base no OWASP Top 10:
1. **Injeção (SQL, XSS, Command):** Pontos de entrada não sanitizados
2. **Autenticação:** Falhas em mecanismos de auth
3. **Dados sensíveis:** Exposição de informações confidenciais
4. **XXE:** Processamento de entidades externas XML
5. **Controle de acesso:** Falhas de autorização
6. **Configuração:** Configurações inseguras
7. **XSS:** Cross-site scripting
8. **Desserialização:** Objetos inseguros
9. **Componentes:** Dependências com vulnerabilidades conhecidas
10. **Logging:** Monitoramento insuficiente

Para cada vulnerabilidade encontrada:
- Severidade: CRITICAL, HIGH, MEDIUM, LOW
- Descrição do risco
- Recomendação de mitigação
- Exemplo de correção`

      const result = await createClaudeMessage(prompt, SYSTEM_PROMPT, { model: CLAUDE_MODELS.sonnet, maxTokens: 4096 })
      await ctx.log('INFO', 'Auditoria de segurança concluída')
      return { success: true, result, artifacts: ['security-audit.md'] }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      await ctx.log('ERROR', `Falha na auditoria: ${msg}`)
      return { success: false, error: msg }
    }
  },
}

export const reviewLandingPage: AgentCapability = {
  name: 'reviewLandingPage',
  description: 'Revisa landing page gerada: SEO, acessibilidade, performance e segurança',
  async execute(task: Task, ctx: ExecutionContext): Promise<ExecutionResult> {
    await ctx.log('INFO', 'Iniciando revisão de landing page')
    await ctx.updateProgress(10)

    try {
      // Buscar arquivos gerados pelo PIXEL na mesma orquestração
      let html = '', css = '', js = ''

      if (task.orchestrationId) {
        const pixelExecution = await prisma.agentExecution.findFirst({
          where: {
            task: { orchestrationId: task.orchestrationId },
            agent: { role: 'PIXEL' },
            status: 'COMPLETED',
          },
          orderBy: { completedAt: 'desc' },
          select: { result: true, taskId: true },
        })

        if (pixelExecution?.taskId) {
          const dir = path.join(process.cwd(), 'public', 'generated', pixelExecution.taskId)
          if (fs.existsSync(dir)) {
            html = fs.readFileSync(path.join(dir, 'index.html'), 'utf-8').slice(0, 3000)
            css = fs.readFileSync(path.join(dir, 'style.css'), 'utf-8').slice(0, 2000)
            js = fs.readFileSync(path.join(dir, 'script.js'), 'utf-8').slice(0, 1500)
          }
        }
      }

      if (!html) {
        await ctx.log('WARNING', 'Arquivos da landing page não encontrados, revisão baseada na descrição')
      }

      await ctx.updateProgress(30)

      const codeContext = html
        ? `\n\nARQUIVOS GERADOS (trechos):\n\n--- HTML ---\n${html}\n\n--- CSS ---\n${css}\n\n--- JS ---\n${js}`
        : ''

      const result = await createClaudeMessage(
        `Revise esta landing page com rigor profissional:

**Tarefa:** ${task.title}
**Descrição:** ${task.description || 'Landing page'}${codeContext}

Avalie cada categoria com nota 1-10 e comentários específicos:

1. **SEO (1-10):** Meta tags, H1-H3 hierarchy, alt texts, structured data, semantic HTML
2. **Acessibilidade (1-10):** WCAG 2.1 AA, ARIA attributes, contraste, keyboard nav, focus visible
3. **Performance (1-10):** Tamanho dos arquivos, lazy loading, CSS/JS otimizados, render blocking
4. **Segurança (1-10):** XSS, form validation, external links rel="noopener", CSP headers
5. **Conversão (1-10):** CTA positioning, above-the-fold, urgência, social proof, WhatsApp visível
6. **Mobile (1-10):** Responsividade, touch targets (48px mínimo), viewport, font sizes legíveis
7. **Design (1-10):** Consistência visual, hierarquia, espaçamento, tipografia, cores

Para cada problema encontrado:
- Severidade: CRITICAL / HIGH / MEDIUM / LOW
- Linha/elemento afetado
- Recomendação de correção

Finalize com SCORE TOTAL (média) e veredicto: APPROVED / NEEDS_REVISION / REJECTED.`,
        SYSTEM_PROMPT,
        { model: CLAUDE_MODELS.haiku, maxTokens: 3000 }
      )

      await ctx.log('INFO', 'Revisão de landing page concluída')
      await ctx.updateProgress(90)
      return { success: true, result, artifacts: ['landing-page-review.md'] }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      await ctx.log('ERROR', `Falha na revisão: ${msg}`)
      return { success: false, error: msg }
    }
  },
}

export const sentinelCapabilities: AgentCapability[] = [
  reviewLandingPage,
  reviewCode,
  runTests,
  checkQuality,
  securityAudit,
]
