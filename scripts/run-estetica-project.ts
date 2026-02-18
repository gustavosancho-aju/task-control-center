import * as dotenv from 'dotenv'
dotenv.config()

const BASE = 'https://task-control-center.vercel.app/api'
const DELAY = (ms: number) => new Promise(r => setTimeout(r, ms))

async function api(path: string, method = 'GET', body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json()
  if (!json.success) throw new Error(`API ${path}: ${json.error ?? JSON.stringify(json)}`)
  // Always return the full json so callers can access .data or other fields
  return json
}

function log(emoji: string, msg: string) {
  const time = new Date().toLocaleTimeString('pt-BR')
  console.log(`[${time}] ${emoji}  ${msg}`)
}

function separator(title: string) {
  console.log(`\n${'─'.repeat(60)}`)
  console.log(`  ${title}`)
  console.log(`${'─'.repeat(60)}`)
}

// ─── ESTRUTURA DO PROJETO ────────────────────────────────────────────────────
const PROJECT_TASKS = [
  // FASE 1 — Arquitetura & Planejamento
  {
    title: 'Definir arquitetura da landing page de estética',
    description: 'Planejar estrutura de seções, stack tecnológica (HTML/CSS/JS ou Next.js), paleta de cores e tipografia para site de massagem e maquiagem.',
    priority: 'URGENT' as const,
    agent: 'ARCHITECTON',
    phase: '1 — Arquitetura',
  },
  {
    title: 'Mapear requisitos e público-alvo do serviço de estética',
    description: 'Definir persona da cliente ideal, serviços a destacar (massagem relaxante, drenagem, maquiagem artística, social), diferenciais competitivos e CTA principal.',
    priority: 'HIGH' as const,
    agent: 'MAESTRO',
    phase: '1 — Arquitetura',
  },

  // FASE 2 — Design & UI
  {
    title: 'Criar identidade visual da landing page de estética',
    description: 'Definir paleta de cores (tons rosê, dourado, bege), fontes elegantes (serif para títulos, sans para corpo), logo placeholder e mood board visual.',
    priority: 'HIGH' as const,
    agent: 'PIXEL',
    phase: '2 — Design',
  },
  {
    title: 'Desenvolver layout Hero Section — massagem e maquiagem',
    description: 'Criar seção hero com headline impactante, subtítulo, imagem de fundo (espaço reservado), botão CTA "Agendar Agora" e indicadores de confiança.',
    priority: 'HIGH' as const,
    agent: 'PIXEL',
    phase: '2 — Design',
  },
  {
    title: 'Desenvolver seção de Serviços oferecidos',
    description: 'Cards para cada serviço: Massagem Relaxante, Drenagem Linfática, Maquiagem Social, Maquiagem Artística. Cada card com ícone, nome, descrição e preço.',
    priority: 'HIGH' as const,
    agent: 'PIXEL',
    phase: '2 — Design',
  },
  {
    title: 'Criar seção de Depoimentos e prova social',
    description: 'Layout de testimonials com foto circular, nome da cliente, serviço realizado e avaliação em estrelas. Mínimo 3 depoimentos fictícios para prototipagem.',
    priority: 'MEDIUM' as const,
    agent: 'PIXEL',
    phase: '2 — Design',
  },
  {
    title: 'Desenvolver seção de Agendamento e Contato',
    description: 'Formulário de agendamento com campos: nome, telefone, serviço desejado, data preferida. Botão do WhatsApp e endereço do estúdio com mapa embed.',
    priority: 'HIGH' as const,
    agent: 'PIXEL',
    phase: '2 — Design',
  },

  // FASE 3 — Conteúdo
  {
    title: 'Redigir todos os textos e copywriting da landing page',
    description: 'Escrever headline, subtítulo hero, descrições dos serviços, bio da profissional, textos de confiança ("mais de 500 clientes atendidas"), CTA e rodapé.',
    priority: 'HIGH' as const,
    agent: 'MAESTRO',
    phase: '3 — Conteúdo',
  },
  {
    title: 'Definir estratégia de SEO e meta tags',
    description: 'Title tag, meta description, OG tags para redes sociais, palavras-chave locais (ex: "massagem relaxante [cidade]"), estrutura de headings H1-H3.',
    priority: 'MEDIUM' as const,
    agent: 'MAESTRO',
    phase: '3 — Conteúdo',
  },

  // FASE 4 — QA & Revisão
  {
    title: 'Revisar acessibilidade e responsividade da landing page',
    description: 'Verificar contraste de cores (WCAG AA), alt text em imagens, navegação por teclado, layout mobile-first (375px, 768px, 1280px) e performance Lighthouse.',
    priority: 'HIGH' as const,
    agent: 'SENTINEL',
    phase: '4 — QA',
  },
  {
    title: 'Validar formulário de agendamento e CTA links',
    description: 'Testar validação de campos obrigatórios, máscara de telefone, feedback de envio, link do WhatsApp correto e scroll suave entre seções.',
    priority: 'MEDIUM' as const,
    agent: 'SENTINEL',
    phase: '4 — QA',
  },
  {
    title: 'Aprovação final e checklist de entrega do site de estética',
    description: 'Executar checklist completo: textos revisados, imagens otimizadas, formulário funcional, SEO configurado, deploy checklist, links sociais ativos.',
    priority: 'URGENT' as const,
    agent: 'SENTINEL',
    phase: '4 — QA',
  },
]

// ─── MAIN ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🌸  PROJETO: Landing Page Estética — Massagem & Maquiagem')
  console.log(`📍  Sistema: ${BASE.replace('/api', '')}`)
  console.log(`🕐  Início:  ${new Date().toLocaleString('pt-BR')}\n`)

  // 1. Buscar agentes
  separator('PASSO 1 — Buscando agentes disponíveis')
  const agentsRes = await api('/agents')
  const agents = agentsRes.data ?? agentsRes
  const agentMap: Record<string, string> = {}
  for (const a of agents) {
    agentMap[a.role] = a.id
    log('🤖', `${a.name} (${a.role}) — ${a.tasksCompleted} tarefas concluídas`)
  }

  // 2. Criar tags do projeto
  separator('PASSO 2 — Criando tags do projeto')
  const tagNames = ['landing-page', 'estetica', 'design', 'massagem', 'maquiagem', 'marketing']
  const tagColors = ['#ec4899', '#a855f7', '#3b82f6', '#10b981', '#f59e0b', '#ef4444']
  const tagMap: Record<string, string> = {}

  for (let i = 0; i < tagNames.length; i++) {
    try {
      const tagRes = await api('/tags', 'POST', { name: tagNames[i], color: tagColors[i] })
      const tag = tagRes.data ?? tagRes
      tagMap[tagNames[i]] = tag.id
      log('🏷 ', `Tag criada: #${tagNames[i]}`)
    } catch {
      // Tag pode já existir — buscar pelo nome
      const existingRes = await api('/tags')
      const existing = existingRes.data ?? existingRes
      const found = existing?.find((t: {name: string, id: string}) => t.name === tagNames[i])
      if (found) tagMap[tagNames[i]] = found.id
    }
  }

  // 3. Criar todas as tarefas
  separator('PASSO 3 — Criando tarefas do projeto')
  const taskIds: string[] = []
  let phaseAtual = ''

  for (const t of PROJECT_TASKS) {
    if (t.phase !== phaseAtual) {
      console.log(`\n  📁 ${t.phase}`)
      phaseAtual = t.phase
    }

    const taskRes = await api('/tasks', 'POST', {
      title: t.title,
      description: t.description,
      priority: t.priority,
    })
    const task = taskRes.data ?? taskRes
    taskIds.push(task.id)
    log('📝', `[${t.priority}] ${t.title.slice(0, 55)}...`)

    // Adicionar tags relevantes à tarefa
    const relevantTags = ['landing-page', 'estetica']
    if (t.phase.includes('Design')) relevantTags.push('design')
    if (t.title.toLowerCase().includes('massagem')) relevantTags.push('massagem')
    if (t.title.toLowerCase().includes('maquiagem')) relevantTags.push('maquiagem')
    if (t.phase.includes('Conteúdo')) relevantTags.push('marketing')

    for (const tagName of relevantTags) {
      if (tagMap[tagName]) {
        await api(`/tasks/${task.id}/tags`, 'POST', { tagId: tagMap[tagName] }).catch(() => {})
      }
    }
  }

  log('✅', `${taskIds.length} tarefas criadas com sucesso`)

  // 4. Atribuir agentes
  separator('PASSO 4 — Atribuindo agentes às tarefas')
  for (let i = 0; i < PROJECT_TASKS.length; i++) {
    const t = PROJECT_TASKS[i]
    const agentId = agentMap[t.agent]
    if (!agentId) { log('⚠️ ', `Agente ${t.agent} não encontrado`); continue }

    await api(`/tasks/${taskIds[i]}/assign`, 'POST', { agentId })
    log('👤', `${t.agent} → "${t.title.slice(0, 45)}..."`)
    await DELAY(150)
  }

  // 5. Executar agentes fase por fase
  separator('PASSO 5 — Executando agentes (fase por fase)')

  const fases = ['1 — Arquitetura', '2 — Design', '3 — Conteúdo', '4 — QA']

  for (const fase of fases) {
    console.log(`\n  🚀 Iniciando ${fase}`)
    const faseTasks = PROJECT_TASKS.map((t, i) => ({ ...t, id: taskIds[i] })).filter(t => t.phase === fase)

    for (const t of faseTasks) {
      const agentId = agentMap[t.agent]
      if (!agentId) continue

      try {
        const execRes = await api('/executions', 'POST', { taskId: t.id, agentId })
        const exec = execRes.data ?? execRes
        log('⚡', `Executando: "${t.title.slice(0, 48)}..."`)

        // Monitorar até completar
        let attempts = 0
        while (attempts < 20) {
          await DELAY(2500)
          attempts++
          try {
            const execStatus = await api(`/executions/${exec.id}`)
            const { status, progress } = execStatus.data ?? execStatus
            const bar = '█'.repeat(Math.floor(progress / 10)) + '░'.repeat(10 - Math.floor(progress / 10))
            process.stdout.write(`\r     [${bar}] ${progress}% — ${status}          `)

            if (status === 'COMPLETED' || status === 'FAILED' || status === 'CANCELLED') {
              process.stdout.write('\n')
              if (status === 'COMPLETED') {
                log('✅', `Concluído em ~${attempts * 2.5}s`)
              } else {
                log('⚠️ ', `Status: ${status}`)
              }
              break
            }
          } catch { break }
        }
        if (attempts >= 20) { process.stdout.write('\n'); log('⏱ ', 'Timeout — continuando...') }

      } catch (err: unknown) {
        log('❌', `Erro ao executar: ${err instanceof Error ? err.message : String(err)}`)
      }
      await DELAY(500)
    }
  }

  // 6. Relatório final
  separator('PASSO 6 — Relatório Final do Projeto')

  const allTasksRes = await api(`/tasks?limit=50`)
  const allTasks = allTasksRes.data ?? []

  // Contar por status apenas tarefas deste projeto
  const stats = { TODO: 0, IN_PROGRESS: 0, REVIEW: 0, DONE: 0, BLOCKED: 0 }
  for (const task of allTasks) {
    if (taskIds.includes(task.id)) {
      stats[task.status as keyof typeof stats]++
    }
  }

  console.log('\n  📊 Status das tarefas do projeto:')
  console.log(`     A Fazer:       ${stats.TODO}`)
  console.log(`     Em Progresso:  ${stats.IN_PROGRESS}`)
  console.log(`     Em Revisão:    ${stats.REVIEW}`)
  console.log(`     Concluídas:    ${stats.DONE}`)
  console.log(`     Bloqueadas:    ${stats.BLOCKED}`)

  console.log('\n  🎯 Tarefas criadas no projeto:')
  for (let i = 0; i < PROJECT_TASKS.length; i++) {
    const t = PROJECT_TASKS[i]
    console.log(`     [${t.phase}] ${t.agent.padEnd(12)} — ${t.title.slice(0, 50)}`)
  }

  console.log(`\n  🌐 Acesse o dashboard: ${BASE.replace('/api', '')}`)
  console.log(`  📅 Concluído em: ${new Date().toLocaleString('pt-BR')}`)
  console.log('\n' + '═'.repeat(60) + '\n')
}

main().catch(err => {
  console.error('\n❌ Erro fatal:', err.message)
  process.exit(1)
})
