import { createClaudeMessage } from '@/lib/ai/claude-client'
import type { AgentCapability, ExecutionContext, ExecutionResult } from '../execution-engine'
import type { Task } from '@prisma/client'
import prisma from '@/lib/db'
import { extractCode, extractHtmlClasses } from '@/lib/utils/extract-code'
import * as fs from 'fs'
import * as path from 'path'

const SYSTEM_PROMPT = `Você é o PIXEL, designer de interface do Synkra AIOS.
Sua especialidade é UI/UX, design de componentes, acessibilidade e experiência do usuário.
Forneça especificações visuais detalhadas e focadas na experiência do usuário.`

export const designUI: AgentCapability = {
  name: 'designUI',
  description: 'Cria especificações detalhadas de interface do usuário',
  async execute(task: Task, ctx: ExecutionContext): Promise<ExecutionResult> {
    await ctx.log('INFO', 'Iniciando design de UI')
    await ctx.updateProgress(15)

    try {
      const prompt = `Crie especificações de UI para a seguinte tarefa:

**Tarefa:** ${task.title}
**Descrição:** ${task.description || 'Sem descrição'}

Forneça:
1. **Layout:** Estrutura da página/tela (wireframe em ASCII)
2. **Hierarquia visual:** Ordem de importância dos elementos
3. **Responsividade:** Breakpoints e adaptações (mobile, tablet, desktop)
4. **Interações:** Estados dos elementos (hover, active, disabled, loading)
5. **Tipografia:** Hierarquia de fontes e tamanhos
6. **Cores:** Palette aplicada com contraste adequado
7. **Espaçamento:** Grid system e spacing tokens utilizados
8. **Acessibilidade:** ARIA labels, foco, contraste WCAG AA`

      const result = await createClaudeMessage(prompt, SYSTEM_PROMPT)
      await ctx.log('INFO', 'Design de UI concluído')
      return { success: true, result, artifacts: ['ui-spec.md'] }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      await ctx.log('ERROR', `Falha no design: ${msg}`)
      return { success: false, error: msg }
    }
  },
}

export const createComponents: AgentCapability = {
  name: 'createComponents',
  description: 'Especifica componentes visuais reutilizáveis com props e variantes',
  async execute(task: Task, ctx: ExecutionContext): Promise<ExecutionResult> {
    await ctx.log('INFO', 'Iniciando especificação de componentes')
    await ctx.updateProgress(15)

    try {
      const prompt = `Especifique componentes visuais para a seguinte tarefa:

**Tarefa:** ${task.title}
**Descrição:** ${task.description || 'Sem descrição'}

Para cada componente, forneça:
1. **Nome:** Nome do componente (PascalCase)
2. **Props:** Interface TypeScript com todas as propriedades
3. **Variantes:** Tamanhos, cores, estados (usando Tailwind CSS)
4. **Composição:** Como se integra com outros componentes
5. **Exemplo de uso:** Código JSX de exemplo
6. **Estados:** Default, hover, active, disabled, loading, error
7. **Acessibilidade:** Roles, aria-labels, keyboard navigation

Use como base: React + Tailwind CSS + shadcn/ui`

      const result = await createClaudeMessage(prompt, SYSTEM_PROMPT)
      await ctx.log('INFO', 'Especificação de componentes concluída')
      return { success: true, result, artifacts: ['components-spec.md'] }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      await ctx.log('ERROR', `Falha na especificação: ${msg}`)
      return { success: false, error: msg }
    }
  },
}

export const reviewUX: AgentCapability = {
  name: 'reviewUX',
  description: 'Analisa experiência do usuário e sugere melhorias de usabilidade',
  async execute(task: Task, ctx: ExecutionContext): Promise<ExecutionResult> {
    await ctx.log('INFO', 'Iniciando revisão de UX')
    await ctx.updateProgress(15)

    try {
      const prompt = `Faça uma revisão de UX para a seguinte tarefa:

**Tarefa:** ${task.title}
**Descrição:** ${task.description || 'Sem descrição'}

Analise:
1. **Fluxo do usuário:** Jornada completa e pontos de fricção
2. **Usabilidade:** Facilidade de uso e intuitividade
3. **Feedback visual:** Loading states, confirmações, erros
4. **Consistência:** Padrões repetidos e previsibilidade
5. **Eficiência:** Número de cliques/passos para completar ações
6. **Acessibilidade:** Inclusão para usuários com deficiências
7. **Mobile-first:** Experiência em dispositivos móveis
8. **Heurísticas de Nielsen:** Avaliação contra as 10 heurísticas

Para cada problema encontrado:
- Severidade: CRITICAL, HIGH, MEDIUM, LOW
- Heurística violada
- Recomendação de melhoria`

      const result = await createClaudeMessage(prompt, SYSTEM_PROMPT)
      await ctx.log('INFO', 'Revisão de UX concluída')
      return { success: true, result, artifacts: ['ux-review.md'] }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      await ctx.log('ERROR', `Falha na revisão de UX: ${msg}`)
      return { success: false, error: msg }
    }
  },
}

export const createStyleGuide: AgentCapability = {
  name: 'createStyleGuide',
  description: 'Cria guia de estilos com tokens, cores, tipografia e padrões visuais',
  async execute(task: Task, ctx: ExecutionContext): Promise<ExecutionResult> {
    await ctx.log('INFO', 'Iniciando criação do style guide')
    await ctx.updateProgress(15)

    try {
      const prompt = `Crie um guia de estilos para a seguinte tarefa:

**Tarefa:** ${task.title}
**Descrição:** ${task.description || 'Sem descrição'}

Defina:
1. **Design Tokens:**
   - Cores: primary, secondary, accent, neutral, semantic (success, warning, error)
   - Tipografia: font-family, font-sizes, line-heights, font-weights
   - Espaçamento: scale de spacing (4px base)
   - Border radius: scale de arredondamento
   - Shadows: elevação e profundidade

2. **Componentes base:**
   - Botões: variantes e tamanhos
   - Inputs: estados e validação
   - Cards: layouts e composições
   - Modals: estrutura e animações

3. **Padrões de layout:**
   - Grid system
   - Breakpoints
   - Container widths

4. **Animações:**
   - Transições padrão
   - Micro-interações
   - Durações e easings

Use formato compatível com Tailwind CSS e CSS custom properties.`

      const result = await createClaudeMessage(prompt, SYSTEM_PROMPT)
      await ctx.log('INFO', 'Style guide criado com sucesso')
      return { success: true, result, artifacts: ['style-guide.md'] }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      await ctx.log('ERROR', `Falha na criação do style guide: ${msg}`)
      return { success: false, error: msg }
    }
  },
}

export const generateLandingPage: AgentCapability = {
  name: 'generateLandingPage',
  description: 'Gera HTML, CSS e JS completos de uma landing page baseado no plano do ARCHITECTON',
  async execute(task: Task, ctx: ExecutionContext): Promise<ExecutionResult> {
    await ctx.log('INFO', 'Iniciando geração de landing page')
    await ctx.updateProgress(5)

    try {
      // Buscar plano do ARCHITECTON na mesma orquestração
      let architecturePlan = ''
      if (task.orchestrationId) {
        const archExecution = await prisma.agentExecution.findFirst({
          where: {
            task: { orchestrationId: task.orchestrationId },
            agent: { role: 'ARCHITECTON' },
            status: 'COMPLETED',
          },
          orderBy: { completedAt: 'desc' },
          select: { result: true },
        })
        architecturePlan = archExecution?.result ?? ''
      }

      if (!architecturePlan) {
        architecturePlan = task.description || 'Landing page institucional moderna'
      }

      await ctx.log('INFO', 'Plano do ARCHITECTON recuperado, gerando HTML...')
      await ctx.updateProgress(15)

      // STEP 1: Gerar HTML
      const htmlResult = await createClaudeMessage(
        `Com base neste plano arquitetural, gere o HTML COMPLETO da landing page:

${architecturePlan}

REGRAS OBRIGATÓRIAS:
- HTML5 semântico (<header>, <nav>, <main>, <section>, <footer>)
- Google Fonts via <link> no <head> (NUNCA use Inter, Arial ou Roboto — use fontes distintivas como Cormorant Garamond, DM Sans, Playfair Display, Outfit, etc.)
- Meta tags completas (viewport, description, charset, og:tags)
- Favicon via SVG data URI
- Classes BEM para styling (.hero__title, .card__body, etc.)
- Atributos data-animate="fade-up" nos elementos para animação
- Atributos data-delay="100|200|300" para stagger
- Elemento .hero__blob para efeito orgânico animado
- Botão WhatsApp fixo com link wa.me
- Formulário de contato com campos: nome, telefone, mensagem
- Mínimo 8 seções: hero, diferenciais/features, serviços, sobre, depoimentos, processo/timeline, FAQ, contato/footer
- Link para style.css e script.js externos
- TODO o texto em português do Brasil

Retorne APENAS o código HTML completo dentro de um bloco \`\`\`html.`,
        SYSTEM_PROMPT
      )

      const html = extractCode(htmlResult, 'html')
      await ctx.log('INFO', `HTML gerado (${(html.length / 1024).toFixed(1)} KB)`)
      await ctx.updateProgress(40)

      // STEP 2: Extrair classes do HTML para garantir consistência com CSS
      const htmlClasses = extractHtmlClasses(html)
      await ctx.log('INFO', `${htmlClasses.length} classes CSS extraídas do HTML`)

      // STEP 3: Gerar CSS
      const cssResult = await createClaudeMessage(
        `Gere o CSS COMPLETO para esta landing page.

CLASSES USADAS NO HTML (use EXATAMENTE estes nomes):
${htmlClasses.join(', ')}

REGRAS OBRIGATÓRIAS:
- Design system com CSS custom properties (:root { --primary: ...; --secondary: ...; })
- Tipografia fluida com clamp() para font-sizes
- Reset/normalize no início
- Mobile-first com breakpoints: 640px, 768px, 1024px, 1280px
- Hero: gradient mesh background (múltiplos radial-gradient sobrepostos), blob orgânico com border-radius: 60% 40% 30% 70% e animação float
- Nav: fixed, fundo blur com backdrop-filter no scroll, transição suave
- Cards: hover lift (translateY -8px), sombra dinâmica, efeito shine overlay
- Depoimentos: aspas decorativas, avatar com glow border
- FAQ accordion: transição max-height, rotação do ícone
- Formulário: floating labels, focus com sombra colorida
- Botão WhatsApp: fixed bottom-right, animação pulse ring
- Scrollbar customizada (6px, cor primary)
- Animações de entrada: fade-up, fade-in, scale-in
- Transições suaves (0.3s ease) em todos os interativos
- Cores e fontes conforme o plano arquitetural

Retorne APENAS o código CSS completo dentro de um bloco \`\`\`css.`,
        SYSTEM_PROMPT
      )

      const css = extractCode(cssResult, 'css')
      await ctx.log('INFO', `CSS gerado (${(css.length / 1024).toFixed(1)} KB)`)
      await ctx.updateProgress(65)

      // STEP 4: Gerar JavaScript
      const jsResult = await createClaudeMessage(
        `Gere o JavaScript COMPLETO para esta landing page. Vanilla JS, sem dependências.

FUNCIONALIDADES OBRIGATÓRIAS:
1. IntersectionObserver: elementos com [data-animate] fazem fade-in com stagger baseado em data-delay
2. Nav inteligente: adiciona classe .scrolled ao scroll > 80px, links ativos com aria-current
3. Menu mobile: hamburger → X, drawer da direita, overlay, fecha com Escape
4. Contadores animados: easing easeOutQuart, conta de 0 ao target em 2s (elementos com data-count)
5. Botão WhatsApp: aparece após 3s com animação scale, tooltip no hover
6. Formulário: floating labels (move label quando input tem foco/valor), máscara de telefone (00) 00000-0000, validação no blur, estado loading no submit
7. FAQ accordion: transição max-height, ícone rotaciona 180deg, apenas um aberto por vez
8. Smooth scroll para âncoras internas
9. Parallax leve no hero (blob + background em velocidades diferentes, desabilitado no mobile)

REGRAS:
- Use 'use strict'
- DOMContentLoaded wrapper
- Funções utilitárias: throttle(), debounce()
- Sem frameworks, sem jQuery
- Performance: requestAnimationFrame para parallax, passive listeners

Retorne APENAS o código JavaScript dentro de um bloco \`\`\`javascript.`,
        SYSTEM_PROMPT
      )

      const js = extractCode(jsResult, 'javascript')
      await ctx.log('INFO', `JavaScript gerado (${(js.length / 1024).toFixed(1)} KB)`)
      await ctx.updateProgress(85)

      // STEP 5: Salvar arquivos
      const outputDir = path.join(process.cwd(), 'public', 'generated', task.id)
      fs.mkdirSync(outputDir, { recursive: true })
      fs.writeFileSync(path.join(outputDir, 'index.html'), html, 'utf-8')
      fs.writeFileSync(path.join(outputDir, 'style.css'), css, 'utf-8')
      fs.writeFileSync(path.join(outputDir, 'script.js'), js, 'utf-8')

      await ctx.log('INFO', `Arquivos salvos em public/generated/${task.id}/`)
      await ctx.updateProgress(95)

      const summary = `Landing page gerada com sucesso:
- HTML: ${(html.length / 1024).toFixed(1)} KB (${htmlClasses.length} classes)
- CSS: ${(css.length / 1024).toFixed(1)} KB
- JS: ${(js.length / 1024).toFixed(1)} KB
- Preview: /generated/${task.id}/index.html`

      return {
        success: true,
        result: summary,
        artifacts: [
          `public/generated/${task.id}/index.html`,
          `public/generated/${task.id}/style.css`,
          `public/generated/${task.id}/script.js`,
        ],
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      await ctx.log('ERROR', `Falha na geração: ${msg}`)
      return { success: false, error: msg }
    }
  },
}

export const pixelCapabilities: AgentCapability[] = [
  generateLandingPage,
  designUI,
  createComponents,
  reviewUX,
  createStyleGuide,
]
