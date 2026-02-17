import { createClaudeMessage } from '@/lib/ai/claude-client'
import type { AgentCapability, ExecutionContext, ExecutionResult } from '../execution-engine'
import type { Task } from '@prisma/client'

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

export const pixelCapabilities: AgentCapability[] = [
  designUI,
  createComponents,
  reviewUX,
  createStyleGuide,
]
