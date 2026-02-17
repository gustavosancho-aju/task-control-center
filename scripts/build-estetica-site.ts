/**
 * AGENTE AUTÔNOMO DE CRIAÇÃO DE SITE
 * ====================================
 * Usa Claude AI para criar uma landing page completa de estética
 * gerando arquivos reais: HTML, CSS, JS e assets.
 *
 * Arquitetura:
 *   ARCHITECTON → define estrutura e plano técnico
 *   MAESTRO     → escreve os textos e copywriting
 *   PIXEL       → cria todo o HTML + CSS (design completo)
 *   SENTINEL    → revisa, valida e gera relatório final
 *
 * Integração Task Control Center:
 *   Cada fase cria uma tarefa no TCC e atualiza status em tempo real.
 *   Acompanhe em: https://task-control-center.vercel.app
 */

import Anthropic from '@anthropic-ai/sdk'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config()

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const OUTPUT_DIR = path.join(process.cwd(), 'landing-page-estetica')
const MODEL = 'claude-sonnet-4-5-20250929'
const TCC_BASE = 'https://task-control-center.vercel.app/api'

// ─── TASK CONTROL CENTER CLIENT ─────────────────────────────────────────────

interface TccTask { id: string; title: string }
interface TccExecution { id: string }
interface TccAgent { id: string; role: string; name: string }

async function tccApi(endpoint: string, method = 'GET', body?: unknown) {
  try {
    const res = await fetch(`${TCC_BASE}${endpoint}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
    const json = await res.json() as { success?: boolean; data?: unknown; error?: string }
    if (!json.success && json.error) throw new Error(json.error)
    return json.data ?? json
  } catch {
    // TCC offline ou erro de rede — não bloqueia o pipeline
    return null
  }
}

class TccMonitor {
  private agentMap: Record<string, string> = {}
  private taskMap: Record<string, TccTask> = {}
  private execMap: Record<string, TccExecution> = {}
  private sessionTag = `build-${Date.now()}`

  async init() {
    log('TCC', 'Conectando ao Task Control Center...')
    const agents = await tccApi('/agents') as TccAgent[] | null
    if (!agents || !Array.isArray(agents)) {
      log('TCC', '⚠️  TCC offline — pipeline continua sem monitoramento')
      return
    }
    for (const a of agents) this.agentMap[a.role] = a.id
    log('TCC', `✓ ${agents.length} agentes conectados`)
  }

  async startFase(faseNum: number, agent: string, title: string, description: string) {
    const agentId = this.agentMap[agent]

    // 1. Criar tarefa no TCC
    const task = await tccApi('/tasks', 'POST', {
      title: `[${this.sessionTag}] Fase ${faseNum}: ${title}`,
      description,
      priority: faseNum === 1 ? 'URGENT' : 'HIGH',
    }) as TccTask | null

    if (!task?.id) return
    this.taskMap[agent] = task

    // 2. Atribuir agente e marcar IN_PROGRESS em paralelo
    await Promise.all([
      agentId ? tccApi(`/tasks/${task.id}/assign`, 'POST', { agentId }) : Promise.resolve(),
      tccApi(`/tasks/${task.id}`, 'PATCH', { status: 'IN_PROGRESS' }),
    ])

    // 3. Criar execução no modo MANUAL — fica como RUNNING no Monitor
    if (agentId) {
      const execRes = await tccApi('/executions', 'POST', {
        taskId: task.id,
        agentId,
        manual: true,   // ← não aciona o engine, cria com status RUNNING
      }) as { execution?: TccExecution } | null
      const exec = execRes?.execution ?? (execRes as unknown as TccExecution | null)
      if (exec?.id) {
        this.execMap[agent] = exec
        // Log inicial visível no Monitor
        await tccApi(`/executions/${exec.id}/logs`, 'POST', {
          level: 'INFO',
          message: `🚀 Fase ${faseNum} iniciada: ${title}`,
        })
      }
    }

    log('TCC', `📋 Tarefa criada: "${title}" → RUNNING no Monitor`)
  }

  async logStep(agent: string, message: string) {
    const exec = this.execMap[agent]
    if (!exec?.id) return
    await tccApi(`/executions/${exec.id}/logs`, 'POST', {
      level: 'INFO',
      message,
    })
  }

  async updateProgress(agent: string, progress: number) {
    const exec = this.execMap[agent]
    if (!exec?.id) return
    await tccApi(`/executions/${exec.id}`, 'PATCH', { progress })
  }

  async completeFase(agent: string, summary: string) {
    const task = this.taskMap[agent]
    const exec = this.execMap[agent]
    if (!task?.id) return

    // Marcar execução como COMPLETED com progress 100
    if (exec?.id) {
      await tccApi(`/executions/${exec.id}`, 'PATCH', { status: 'COMPLETED', progress: 100 })
      await tccApi(`/executions/${exec.id}/logs`, 'POST', {
        level: 'INFO',
        message: `✅ ${summary}`,
      })
    }

    // Marcar tarefa como DONE
    await tccApi(`/tasks/${task.id}`, 'PATCH', { status: 'DONE' })
    log('TCC', `✅ Fase concluída: "${task.title.split(': ')[1]}"`)
  }

  async failFase(agent: string, error: string) {
    const task = this.taskMap[agent]
    const exec = this.execMap[agent]
    if (!task?.id) return

    if (exec?.id) {
      await tccApi(`/executions/${exec.id}`, 'PATCH', { status: 'FAILED' })
      await tccApi(`/executions/${exec.id}/logs`, 'POST', {
        level: 'ERROR',
        message: `❌ Erro: ${error}`,
      })
    }

    await tccApi(`/tasks/${task.id}`, 'PATCH', { status: 'BLOCKED' })
    log('TCC', `❌ Fase com erro: ${error}`)
  }

  getDashboardUrl() {
    return `https://task-control-center.vercel.app?q=${this.sessionTag}`
  }
}

const tcc = new TccMonitor()

// ─── HELPERS ────────────────────────────────────────────────────────────────

function log(agent: string, msg: string) {
  const time = new Date().toLocaleTimeString('pt-BR')
  const colors: Record<string, string> = {
    ARCHITECTON: '\x1b[34m', // azul
    MAESTRO:     '\x1b[35m', // magenta
    PIXEL:       '\x1b[36m', // ciano
    SENTINEL:    '\x1b[32m', // verde
    SISTEMA:     '\x1b[33m', // amarelo
    TCC:         '\x1b[37m', // branco
  }
  const reset = '\x1b[0m'
  const color = colors[agent] ?? ''
  console.log(`[${time}] ${color}[${agent}]${reset} ${msg}`)
}

function step(n: number, title: string) {
  console.log(`\n${'═'.repeat(65)}`)
  console.log(`  FASE ${n}: ${title}`)
  console.log('═'.repeat(65))
}

async function claude(system: string, user: string, maxTokens = 4096): Promise<string> {
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: user }],
  })
  return (res.content[0] as { text: string }).text
}

function write(filename: string, content: string) {
  const filepath = path.join(OUTPUT_DIR, filename)
  fs.writeFileSync(filepath, content, 'utf-8')
  const kb = (content.length / 1024).toFixed(1)
  log('SISTEMA', `Arquivo salvo: ${filename} (${kb} KB)`)
}

function extractCode(text: string, lang: string): string {
  // Regex primária: captura conteúdo entre fences ```lang ... ```
  const fencePattern = '`\`\`' + lang + '[^\\n]*\\n([\\s\\S]*?)`\`\`'
  const match = text.match(new RegExp(fencePattern, 'i'))
  if (match) return match[1].trim()

  // Fallback: remove fence da primeira e última linha se presentes
  const lines = text.trim().split('\n')
  const start = lines[0].startsWith('`\`\`') ? 1 : 0
  const end = lines[lines.length - 1].trim() === '`\`\`' ? lines.length - 1 : lines.length
  return lines.slice(start, end).join('\n').trim()
}

// ─── FASE 1: ARCHITECTON ────────────────────────────────────────────────────

async function fase1_arquitetura(): Promise<string> {
  step(1, 'ARCHITECTON — Arquitetura e Planejamento')
  log('ARCHITECTON', 'Analisando requisitos do projeto de estética...')

  await tcc.startFase(1, 'ARCHITECTON', 'Arquitetura e Planejamento',
    'Definir estrutura de seções, paleta de cores, tipografia, proposta de valor e stack técnica.')
  await tcc.logStep('ARCHITECTON', 'Iniciando análise de requisitos para landing page de estética...')

  const plan = await claude(
    `Você é o ARCHITECTON, arquiteto especialista em landing pages de alta conversão.
Pense como um CTO e estrategista digital para negócios de beleza e bem-estar.`,
    `Crie um plano técnico DETALHADO para uma landing page de estética com:
- Serviços: Massagem Relaxante, Drenagem Linfática, Maquiagem Social e Artística
- Público: Mulheres 25-55 anos, classe B/C, valorizam autocuidado
- Objetivo: Captar agendamentos via WhatsApp

Defina:
1. Estrutura de seções (em ordem)
2. Paleta de cores exata (hex codes) — tons quentes, femininos, premium
3. Fontes Google (títulos e corpo)
4. Proposta de valor única e headline principal
5. Textos dos CTAs
6. Stack técnica: HTML5 semântico + CSS3 puro + JS vanilla (sem frameworks)
7. Número de WhatsApp fictício para CTA: (11) 99999-8888

Seja específico com cores e textos — eles serão usados diretamente no código.`
  )

  log('ARCHITECTON', 'Plano técnico definido ✓')
  await tcc.logStep('ARCHITECTON', '✓ Plano técnico gerado: paleta de cores, fontes, seções e proposta de valor definidas.')
  write('01_plano_arquitetura.md', plan)
  await tcc.completeFase('ARCHITECTON', `Plano arquitetural completo (${(plan.length/1024).toFixed(1)} KB). Paleta, tipografia e estrutura definidas.`)
  return plan
}

// ─── FASE 2: MAESTRO ────────────────────────────────────────────────────────

async function fase2_copywriting(plan: string): Promise<string> {
  step(2, 'MAESTRO — Copywriting e Conteúdo')
  log('MAESTRO', 'Redigindo todos os textos da landing page...')

  await tcc.startFase(2, 'MAESTRO', 'Copywriting e Conteúdo',
    'Redigir todos os textos: headline, descrições dos serviços, depoimentos, FAQ e CTAs.')
  await tcc.logStep('MAESTRO', 'Iniciando redação de todos os textos da landing page em PT-BR...')

  const copy = await claude(
    `Você é o MAESTRO, especialista em copywriting de alta conversão para negócios de beleza.
Escreva textos que convertam, emocionem e vendam com elegância e autenticidade.`,
    `Com base neste plano arquitetural:
${plan}

Escreva TODOS os textos da landing page em português do Brasil:

1. **HERO**: headline (máx 8 palavras), subtítulo (2 linhas), CTA botão
2. **SOBRE**: parágrafo sobre a profissional (fictícia: "Ana Beatriz Silva, 10 anos de experiência")
3. **SERVIÇOS** (para cada um): nome, descrição 2 linhas, preço fictício, duração
   - Massagem Relaxante: R$ 120, 60 min
   - Drenagem Linfática: R$ 150, 60 min
   - Maquiagem Social: R$ 180, 90 min
   - Maquiagem Artística: R$ 250, 120 min
4. **DEPOIMENTOS** (3 fictícios): nome, texto, serviço realizado
5. **FAQ** (4 perguntas + respostas)
6. **CTA FINAL**: headline urgência, subtítulo, botão WhatsApp
7. **FOOTER**: endereço fictício (São Paulo - SP), horários, redes sociais

Retorne os textos em formato JSON estruturado.`,
    3000
  )

  log('MAESTRO', 'Copywriting finalizado ✓')
  await tcc.logStep('MAESTRO', '✓ Copywriting gerado: headline, serviços, depoimentos, FAQ e CTAs.')
  write('02_copywriting.json', copy)
  await tcc.completeFase('MAESTRO', `Todos os textos redigidos em JSON (${(copy.length/1024).toFixed(1)} KB). Pronto para o PIXEL.`)
  return copy
}

// ─── FASE 3: PIXEL ──────────────────────────────────────────────────────────

async function fase3_html(plan: string, copy: string): Promise<void> {
  step(3, 'PIXEL — Design e Desenvolvimento Frontend')
  log('PIXEL', 'Criando HTML estruturado e semântico...')

  await tcc.startFase(3, 'PIXEL', 'Design e Desenvolvimento Frontend',
    'Criar index.html (layout semântico), style.css (design system premium) e script.js (interatividade avançada).')
  await tcc.logStep('PIXEL', '🎨 Iniciando geração do HTML — estrutura semântica + classes + data-attributes de animação...')

  const html = await claude(
    `Você é o PIXEL, diretor de design e engenheiro frontend sênior com padrão Vercel/Linear/Stripe.
Você cria landing pages MEMORÁVEIS — não genéricas. Cada projeto tem identidade visual única e coerente.
Seus sites são referência de design: tipografia cuidadosa, espaçamento preciso, hierarquia visual clara,
elementos interativos que surpreendem. Você NUNCA usa fontes genéricas (Arial, Inter, Roboto) nem layouts
previsíveis. Cada escolha é intencional e reforça a marca.`,
    `Com base no plano e copywriting abaixo, crie o HTML COMPLETO da landing page de estética:

PLANO ARQUITETURAL:
${plan.slice(0, 1500)}

COPYWRITING:
${copy.slice(0, 1500)}

ESTRUTURA OBRIGATÓRIA DAS SEÇÕES (nesta ordem):
1. <header> — nav fixa com logo, links e CTA
2. <section id="hero"> — hero fullscreen com headline impactante, subtítulo, CTA duplo e badge de credibilidade
3. <section id="diferenciais"> — 3 pilares da marca em cards elegantes com ícones SVG inline
4. <section id="servicos"> — grid de 4 cards de serviço com imagem, preço, duração e CTA individual
5. <section id="sobre"> — foto da profissional + bio + 3 stats animados (counter)
6. <section id="depoimentos"> — 3 testimonials em cards com avatar, quote, nome e serviço
7. <section id="processo"> — timeline de 4 passos de como funciona o atendimento
8. <section id="faq"> — 4 perguntas em accordion
9. <section id="contato"> — formulário + WhatsApp CTA + endereço
10. <footer> — links, redes sociais, copyright

PADRÕES TÉCNICOS OBRIGATÓRIOS:
- HTML5 semântico estrito: <header>, <nav>, <main>, <section>, <article>, <footer>, <address>
- data-animate="fade-up" em todos elementos animáveis pelo JS
- data-delay="0|100|200|300" para stagger das animações
- aria-label em todos os botões e links de ícone
- role="list" / role="listitem" onde necessário para acessibilidade
- Link para style.css e script.js externos
- Meta tags completas: charset, viewport, description, keywords, OG (og:title, og:description, og:image, og:type), Twitter Card
- <title> otimizado para SEO local
- Favicon via data URI SVG com emoji 💆‍♀️
- Google Fonts no <head>: escolha 2 fontes ÚNICAS e elegantes para o segmento de beleza premium
  (exemplos: Cormorant Garamond + DM Sans, Playfair Display + Jost, Libre Caslon + Plus Jakarta Sans)
  NÃO use Inter, Roboto, Arial ou fontes genéricas
- Imagens usando placehold.co com dimensões corretas: placehold.co/800x600/[hex]/[hex]?text=[texto]
- loading="lazy" em todas imagens exceto hero
- Botões WhatsApp: href="https://wa.me/5511999998888?text=[mensagem%20pré-preenchida]"
- Botão WhatsApp flutuante com id="whatsapp-float" fixo no canto inferior direito
- Seção hero com elemento <div class="hero__blob"> para forma orgânica decorativa via CSS
- Cards de serviço com <div class="card__shine"> para efeito de brilho no hover
- Seção stats com data-target="[número]" para animação de contador JS

Retorne APENAS o código HTML dentro de \`\`\`html ... \`\`\``,
    8000
  )

  const htmlCode = extractCode(html, 'html')
  write('index.html', htmlCode)
  await tcc.logStep('PIXEL', `✓ index.html gerado (${(htmlCode.length/1024).toFixed(1)} KB) — ${htmlCode.split('\n').length} linhas de HTML semântico`)

  // Extrai classes reais do HTML para garantir consistência no CSS
  const classMatches = htmlCode.match(/class="([^"]+)"/g) ?? []
  const htmlClasses = Array.from(new Set(
    classMatches.flatMap(m => m.replace(/class="([^"]+)"/, '$1').split(' '))
  )).filter(Boolean).sort().join(', ')

  // CSS
  log('PIXEL', 'Criando CSS premium com design system e animações orquestradas...')
  await tcc.logStep('PIXEL', '🎨 Gerando style.css — design system, tipografia fluida, animações e responsividade...')
  const css = await claude(
    `Você é o PIXEL, especialista em CSS de nível Stripe/Vercel/Linear.
Você cria sistemas de design visuais que são REFERÊNCIA — não templates comuns.
Seus princípios: tipografia como elemento de design, espaçamento matemático (escala 4/8px),
profundidade através de sombras em camadas, movimento com propósito, cores com personalidade.
Você NUNCA usa gradientes roxo/branco genéricos, fontes sem caráter ou layouts cookie-cutter.`,
    `Crie o CSS COMPLETO (style.css) para a landing page de estética premium.
Use o plano arquitetural como referência de paleta e tipografia:
${plan.slice(0, 1500)}

⚠️ CRÍTICO — CLASSES OBRIGATÓRIAS:
O HTML já foi gerado com as seguintes classes exatas. Você DEVE usar EXATAMENTE esses nomes
nos seletores CSS — NÃO invente nomes alternativos:
${htmlClasses}

═══════════════════════════════════════════════════
DESIGN SYSTEM — CSS CUSTOM PROPERTIES
═══════════════════════════════════════════════════
:root {
  /* Paleta principal — tons quentes femininos premium */
  /* Defina: --color-primary, --color-primary-light, --color-primary-dark */
  /* --color-accent (dourado/cobre), --color-surface, --color-surface-alt */
  /* --color-text, --color-text-muted, --color-text-light */
  /* --color-border, --color-border-strong */

  /* Tipografia — escala fluida com clamp() */
  /* --font-display: fonte serif/elegante para títulos */
  /* --font-body: fonte sans moderna para corpo */
  /* --text-xs a --text-6xl usando clamp(min, vw, max) */

  /* Espaçamento — base 4px */
  /* --space-1 (4px) a --space-20 (80px) */

  /* Sombras em camadas para profundidade real */
  /* --shadow-sm, --shadow-md, --shadow-lg, --shadow-xl, --shadow-glow */

  /* Bordas e raios */
  /* --radius-sm, --radius-md, --radius-lg, --radius-full */

  /* Transições com curvas de animação */
  /* --ease-bounce, --ease-smooth, --ease-spring */
  /* --duration-fast (150ms), --duration-base (300ms), --duration-slow (600ms) */
}

═══════════════════════════════════════════════════
ELEMENTOS VISUAIS OBRIGATÓRIOS
═══════════════════════════════════════════════════

1. CSS RESET MODERNO
   - *, *::before, *::after { box-sizing: border-box }
   - margin/padding 0 em todos elementos
   - scroll-behavior: smooth no html
   - font-synthesis: none
   - text-rendering: optimizeLegibility

2. TIPOGRAFIA EXPRESSIVA
   - Escala tipográfica usando as Google Fonts escolhidas no HTML
   - h1: fonte display, peso 300-400, letter-spacing negativo (-0.02em a -0.04em)
   - h2: mistura display + refinamento, tamanho fluido com clamp()
   - body: fonte sans, line-height 1.6-1.7, cor text-muted levemente suave
   - Parágrafos lead com font-size maior e peso 300
   - Destaque de palavras com <em> em itálico da fonte display
   - Texto uppercase com letter-spacing 0.12em para labels e tags

3. HERO SECTION — Cinematográfica
   - min-height: 100svh (svh para mobile correto)
   - Background: gradiente mesh em CSS usando múltiplos radial-gradient sobrepostos
     com cores da paleta em opacidades 0.15-0.4 para profundidade atmosférica
   - .hero__blob: forma orgânica absoluta via border-radius complexo (60% 40% 30% 70% / 60% 30% 70% 40%)
     com cor primária em opacity 0.08-0.12, animação float infinita
   - Conteúdo centralizado com padding-top: var(--nav-height)
   - headline com gradient text (background-clip: text) se fizer sentido estético
   - Linha decorativa antes do headline: pseudo-element ::before com largura 48px, 2px, cor accent
   - Dois CTAs: primário (sólido) + secundário (outline ou ghost)
   - Badge de credibilidade: pill com ícone estrela e texto "X+ clientes atendidas"
   - Scroll indicator animado na base

4. NAVEGAÇÃO PREMIUM
   - position: fixed, width: 100%, z-index: 1000
   - Inicial: background transparente, logo + links brancos/claros
   - .scrolled: backdrop-filter: blur(20px) saturate(180%), background: rgba(branco/escuro, 0.85)
     border-bottom: 1px solid var(--color-border)
   - Logo com combinação ícone + texto tipográfico refinado
   - Links com ::after underline que cresce do centro no hover
   - CTA nav: botão pill com gradiente primário
   - Transição suave de 400ms entre estados
   - Mobile: menu lateral (drawer) com overlay escuro, não dropdown comum

5. CARDS DE SERVIÇO — Premium
   - Grid responsivo: 1 col mobile → 2 col tablet → 4 col desktop
   - border-radius: var(--radius-lg), overflow: hidden
   - border: 1px solid var(--color-border)
   - Hover: translateY(-8px), shadow-xl, border-color accent
   - .card__shine: pseudo-element com gradiente linear a 135deg, opacity 0
     no hover: opacity 0.05, transition suave — efeito de brilho sutil
   - Imagem: aspect-ratio 4/3, object-fit: cover com overlay gradient na base
   - Badge "Mais Procurado" / "Especial" com posição absolute, top-right
   - Preço com tipografia de destaque: font-size grande, peso bold, cor accent
   - Duração em badge pill discreto abaixo do preço
   - CTA: botão full-width na base do card

6. SEÇÃO SOBRE — Editorial
   - Layout assimétrico: imagem ocupa 45%, conteúdo 55% no desktop
   - Imagem com border-radius generoso e pseudo-element ::before de moldura decorativa
     (borda 2px accent, deslocada 16px top/left)
   - Stats em linha com número grande (font-display, peso 700) + label pequena uppercase
   - Separador entre stats: linha vertical 1px, height 40px, cor border
   - Citação inspiracional em blockquote com aspas decorativas via ::before em fonte serif grande

7. DEPOIMENTOS — Elegantes
   - Cards com padding generoso, background surface-alt, border-radius lg
   - Aspas ornamentais: ::before com " caractere em font-size 4rem, opacity 0.1, cor primary
   - Quote em itálico, font-size ligeiramente maior, line-height 1.8
   - Avatar: border circular 3px cor accent, box-shadow glow primário
   - Nome em bold, serviço em uppercase tracking-wide cor text-muted
   - Estrelas: color: var(--color-accent) em SVG ou unicode ★

8. TIMELINE DE PROCESSO
   - Layout vertical no mobile, horizontal no desktop
   - Linha conectora: pseudo-element com gradiente primário → accent
   - Números em círculos com gradiente primário, tipografia bold
   - Cards com leve glass effect: background rgba branco 60%, backdrop-filter blur(8px)

9. FAQ ACCORDION
   - border-bottom entre itens, sem box shadow
   - Ícone +/- que rota 45deg quando aberto (transform rotate)
   - Conteúdo com max-height: 0 → max-height: 500px + transition suave
   - Pergunta em peso 500, resposta em text-muted

10. FORMULÁRIO PREMIUM
    - Labels flutuantes (floating label pattern): label posicionada sobre input,
      sobe para topo ao focar/preencher
    - Inputs com border-bottom only (style editorial) OU border full com radius
    - Focus: border-color primary, box-shadow 0 0 0 3px primary/20%
    - Estado erro: border-color vermelho, mensagem erro animada fadeIn abaixo
    - Estado sucesso: ícone checkmark + mensagem verde
    - Botão submit com largura total, gradiente, animação loading no click

11. BOTÃO WHATSAPP FLUTUANTE
    - position: fixed, bottom: 2rem, right: 2rem
    - Círculo 56px com ícone WhatsApp SVG (não emoji)
    - background: #25D366 (verde whatsapp oficial)
    - box-shadow: 0 8px 32px rgba(37, 211, 102, 0.35)
    - @keyframes pulse-ring: anel expandindo infinitamente
    - Tooltip "Fale conosco" aparece no hover (left da bolinha)
    - Inicia opacity:0 scale:0, entra após 3s via classe .visible

12. FOOTER EDITORIAL
    - Fundo escuro (cor primary-dark OU #1a1a1a)
    - Gradiente sutil de cima (transparente) → fundo escuro na borda superior
    - Logo em versão clara, tagline em texto muted pequeno
    - Links em grid 3 colunas (serviços, redes, contato)
    - Hover nos links: cor accent, translateX(4px)
    - Copyright com linha separadora top: 1px solid border/20%

13. ANIMAÇÕES E MOTION
    @keyframes necessários:
    - float: translateY(-12px) ↔ 0, duration 6s ease-in-out infinite (blob hero)
    - fadeInUp: opacity 0 translateY(32px) → 1 translateY(0)
    - scaleIn: opacity 0 scale(0.92) → 1 scale(1)
    - shimmer: background-position 200% → -200% (efeito de brilho)
    - pulse-ring: scale(1) opacity(0.8) → scale(1.8) opacity(0) (whatsapp)
    - countUp: para números animados (controlado via JS)

    [data-animate] { opacity: 0; transform: translateY(32px); transition: opacity 0.7s, transform 0.7s }
    [data-animate].is-visible { opacity: 1; transform: translateY(0) }
    [data-delay="100"] { transition-delay: 0.1s }
    [data-delay="200"] { transition-delay: 0.2s }
    [data-delay="300"] { transition-delay: 0.3s }

14. RESPONSIVIDADE MOBILE-FIRST
    - Base: mobile (320px+), @media(min-width:640px), @media(min-width:768px), @media(min-width:1024px), @media(min-width:1280px)
    - Touch targets mínimo 44px
    - Fontes fluidas com clamp() não precisam de breakpoints adicionais

15. SCROLLBAR CUSTOMIZADA (desktop)
    ::-webkit-scrollbar { width: 6px }
    ::-webkit-scrollbar-track { background: transparent }
    ::-webkit-scrollbar-thumb { background: var(--color-primary); border-radius: 99px }

Retorne APENAS o código CSS dentro de \`\`\`css ... \`\`\``,
    10000
  )

  const cssCode = extractCode(css, 'css')
  write('style.css', cssCode)
  await tcc.logStep('PIXEL', `✓ style.css gerado (${(cssCode.length/1024).toFixed(1)} KB) — design system completo com custom properties e animações`)

  // JS
  log('PIXEL', 'Criando JavaScript com interatividade avançada...')
  await tcc.logStep('PIXEL', '⚡ Gerando script.js — IntersectionObserver, parallax, counters, form validation, drawer mobile...')
  const js = await claude(
    `Você é o PIXEL, especialista em JavaScript vanilla moderno (ES2022+).
Você escreve JS que cria experiências de nível produto — não scripts básicos.
Cada interação é fluida, cada animação tem propósito, cada funcionalidade é robusta.
Zero dependências externas, zero jQuery, máximo de performance nativa.`,
    `Crie o JavaScript COMPLETO (script.js) para a landing page de estética premium.

MÓDULOS E FUNCIONALIDADES (organize em módulos com IIFE ou funções nomeadas):

═══════ 1. SISTEMA DE ANIMAÇÕES DE ENTRADA ═══════
- IntersectionObserver para elementos com [data-animate]
- threshold: 0.12, rootMargin: "0px 0px -60px 0px"
- Adiciona classe .is-visible ao entrar na viewport
- Suporta [data-delay] para escalonamento automático
- Desconecta o observer após animar (performance)

═══════ 2. NAVEGAÇÃO INTELIGENTE ═══════
- Classe .scrolled na <header> quando scroll > 80px
- IntersectionObserver nas seções para highlight do link ativo no menu
- Links ativos recebem aria-current="page" + classe .active
- Scroll suave ao clicar nos links (preventDefault + scrollIntoView com behavior:'smooth' e offset do nav)
- Calcula offset do nav: const navHeight = header.offsetHeight

═══════ 3. MENU MOBILE (DRAWER) ═══════
- Botão hamburger com animação de 3 linhas → X:
  linha do meio desaparece (opacity 0), superior e inferior rotacionam ±45deg
- Menu drawer desliza da direita: translateX(100%) → translateX(0)
- Overlay escuro com fadeIn cobrindo o resto da tela
- Fechar ao clicar no overlay, link ou Escape
- Bloqueia scroll do body enquanto aberto (overflow: hidden)
- aria-expanded no botão, aria-hidden no menu

═══════ 4. CONTADOR ANIMADO ═══════
- Seleciona elementos com [data-target]
- Anima de 0 até o valor alvo quando entra na viewport
- Easing: easeOutQuart — começa rápido, desacelera no final
- Formata número: se >= 1000 usa "+" prefixo, se decimal usa toFixed(1)
- Duração: 2000ms, atualiza a cada requestAnimationFrame
- Função: function easeOutQuart(t) { return 1 - Math.pow(1 - t, 4) }

═══════ 5. BOTÃO WHATSAPP FLUTUANTE ═══════
- Aparece após 3000ms com classe .visible (opacity + scale via CSS)
- Tooltip "Fale conosco" aparece no hover com mouseenter/mouseleave
- Click rastreia evento (console.log para analytics futuros)

═══════ 6. FORMULÁRIO COM UX PREMIUM ═══════
a) Floating labels:
   - Inputs com classe .form-field__input e labels com .form-field__label
   - Eventos focus e blur: adiciona/remove classe .has-value no .form-field
   - Verifica se input.value.trim() !== '' para manter flutuado

b) Máscara de telefone:
   - Input tipo tel com evento 'input'
   - Regex: formata para (00) 00000-0000
   - Permite apenas dígitos, máximo 11 dígitos
   function maskPhone(value) { ... }

c) Validação em tempo real:
   - blur em cada campo verifica e mostra/remove erro
   - Required: campo não pode estar vazio
   - Telefone: mínimo 10 dígitos
   - showError(field, message) e clearError(field)
   - Mensagem de erro fadeIn abaixo do campo

d) Submit:
   - preventDefault, valida todos os campos
   - Botão: mostra spinner (loading state com CSS), disabled=true
   - Simula envio: setTimeout(1500ms)
   - Sucesso: substitui formulário por mensagem de sucesso animada
     com ícone checkmark SVG e texto "Mensagem enviada! Em breve entraremos em contato 💕"

═══════ 7. ACCORDION FAQ ═══════
- Click no header do accordion: toggle classe .is-open no item pai
- Fecha todos os outros abertos (somente 1 aberto por vez)
- Animação via max-height: calcula scrollHeight dinâmico
- Ícone rota via CSS + classe .is-open
- aria-expanded no botão, aria-hidden no conteúdo

═══════ 8. PARALLAX SUTIL NO HERO ═══════
- window scroll event com throttle (requestAnimationFrame)
- Hero blob e imagem de fundo movem em velocidades diferentes
- hero__blob: translateY(scrollY * 0.15)
- hero__background: translateY(scrollY * 0.3)
- Desativa em mobile (window.innerWidth < 768)

═══════ 9. EFEITO CURSOR GLOW (desktop) ═══════
- Cria div.cursor-glow posicionado fixo
- mousemove: atualiza posição com lerp (linear interpolation) suave
- Raio 300px, gradiente radial da cor primária, opacity 0.06
- Desativa em touch devices (pointer: coarse)

═══════ 10. REVEAL DE CARDS COM STAGGER ═══════
- Cards de serviço e depoimentos com IntersectionObserver separado
- Cada card recebe animação com delay incremental (i * 100ms)
- Usa style.transitionDelay dinâmico

═══════ UTILITÁRIOS ═══════
- throttle(fn, delay): evita excesso de chamadas em scroll/resize
- lerp(start, end, factor): interpolação linear para suavizar movimento
- debounce(fn, delay): para eventos de resize

Organize o código em um IIFE principal com sub-funções claramente separadas por comentários.
Adicione comentários de seção.

Retorne APENAS o código JS dentro de \`\`\`javascript ... \`\`\``,
    8000
  )

  const jsCode = extractCode(js, 'javascript')
  write('script.js', jsCode)
  await tcc.logStep('PIXEL', `✓ script.js gerado (${(jsCode.length/1024).toFixed(1)} KB) — ${jsCode.split('\n').length} linhas de JS vanilla`)
  log('PIXEL', 'Design premium e desenvolvimento concluídos ✓')
  await tcc.completeFase('PIXEL', `3 arquivos entregues: index.html + style.css + script.js. Site pronto para revisão do SENTINEL.`)
}

// ─── FASE 4: SENTINEL ───────────────────────────────────────────────────────

async function fase4_revisao(): Promise<void> {
  step(4, 'SENTINEL — Revisão, QA e Relatório Final')
  log('SENTINEL', 'Lendo arquivos gerados para revisão...')

  await tcc.startFase(4, 'SENTINEL', 'QA e Revisão Final',
    'Revisar SEO, acessibilidade, performance, segurança, conversão e responsividade. Gerar relatório final.')
  await tcc.logStep('SENTINEL', '🔍 Lendo arquivos gerados: index.html, style.css, script.js...')

  const html = fs.readFileSync(path.join(OUTPUT_DIR, 'index.html'), 'utf-8')
  const css  = fs.readFileSync(path.join(OUTPUT_DIR, 'style.css'),  'utf-8')
  const js   = fs.readFileSync(path.join(OUTPUT_DIR, 'script.js'),  'utf-8')

  await tcc.logStep('SENTINEL', `📊 Analisando ${(html.length/1024).toFixed(1)} KB HTML + ${(css.length/1024).toFixed(1)} KB CSS + ${(js.length/1024).toFixed(1)} KB JS`)
  log('SENTINEL', 'Executando revisão de qualidade com IA...')

  const review = await claude(
    `Você é o SENTINEL, especialista em qualidade, acessibilidade, SEO e performance web.
Seja direto, técnico e construtivo. Identifique problemas reais e dê soluções práticas.`,
    `Revise a landing page gerada:

=== index.html (primeiras 3000 chars) ===
${html.slice(0, 3000)}

=== style.css (primeiras 2000 chars) ===
${css.slice(0, 2000)}

=== script.js (primeiras 1500 chars) ===
${js.slice(0, 1500)}

Avalie e reporte:
1. **SEO**: meta tags, headings H1-H3, alt texts, structured data
2. **Acessibilidade**: WCAG 2.1 AA, ARIA, contraste, keyboard nav
3. **Performance**: tamanho estimado, otimizações, lazy loading
4. **Segurança**: XSS potencial, formulário, links externos
5. **Conversão**: CTA posicionamento, urgência, prova social
6. **Mobile**: responsividade, touch targets, viewport
7. **Pontuação geral**: /10 para cada categoria

Formato: relatório estruturado em Markdown com ✅ OK, ⚠️ Atenção, ❌ Crítico`,
    3000
  )

  write('04_relatorio_qa.md', review)
  log('SENTINEL', 'Revisão de qualidade concluída ✓')
  await tcc.logStep('SENTINEL', '✓ Relatório QA gerado — SEO, acessibilidade, performance e conversão avaliados.')
  await tcc.completeFase('SENTINEL', `Revisão completa concluída. Relatório em 04_relatorio_qa.md (${(review.length/1024).toFixed(1)} KB).`)
}

// ─── RELATÓRIO FINAL ────────────────────────────────────────────────────────

function relatorioFinal() {
  const files = fs.readdirSync(OUTPUT_DIR)
  const totalSize = files.reduce((acc, f) => {
    try { return acc + fs.statSync(path.join(OUTPUT_DIR, f)).size } catch { return acc }
  }, 0)

  step(5, 'SISTEMA — Relatório Final')
  console.log(`\n  📁 Pasta:   ${OUTPUT_DIR}`)
  console.log(`  📦 Tamanho: ${(totalSize / 1024).toFixed(1)} KB total\n`)
  console.log('  Arquivos gerados:')
  for (const f of files) {
    const size = (fs.statSync(path.join(OUTPUT_DIR, f)).size / 1024).toFixed(1)
    console.log(`    ✅  ${f.padEnd(35)} ${size.padStart(6)} KB`)
  }
  console.log(`\n  🌐 Para visualizar:`)
  console.log(`     cd landing-page-estetica && npx serve .`)
  console.log(`     ou abra index.html diretamente no navegador`)
  console.log(`\n  ✨ Site de estética criado com sucesso!`)
  console.log('═'.repeat(65) + '\n')
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n' + '═'.repeat(65))
  console.log('  🌸  AGENTE AUTÔNOMO — Landing Page Estética')
  console.log('  💆‍♀️  Massagem & Maquiagem — Criação Automática com IA')
  console.log(`  🕐  Início: ${new Date().toLocaleString('pt-BR')}`)
  console.log('═'.repeat(65))

  // Conectar ao Task Control Center para monitoramento em tempo real
  await tcc.init()
  console.log(`\n  📡 Acompanhe ao vivo: ${tcc.getDashboardUrl()}`)
  console.log('─'.repeat(65))

  // Limpar diretório
  fs.readdirSync(OUTPUT_DIR).forEach(f => fs.unlinkSync(path.join(OUTPUT_DIR, f)))

  const plan = await fase1_arquitetura()
  const copy = await fase2_copywriting(plan)
  await fase3_html(plan, copy)
  await fase4_revisao()
  relatorioFinal()
}

main().catch(err => {
  console.error('\n❌ Erro fatal:', err.message)
  process.exit(1)
})
