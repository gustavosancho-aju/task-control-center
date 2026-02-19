import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seed() {
  console.log('Iniciando seed dos agentes...\n')

  const agents = [
    {
      name: 'Maestro',
      role: 'MAESTRO' as const,
      description: 'Orquestrador principal. Coordena tarefas e distribui trabalho entre agentes.',
      skills: ['orquestracao', 'planejamento', 'coordenacao', 'priorizacao'],
    },
    {
      name: 'Sentinel',
      role: 'SENTINEL' as const,
      description: 'Revisor e guardiao da qualidade. Analisa codigo e verifica padroes.',
      skills: ['code review', 'testes', 'qualidade', 'seguranca', 'performance'],
    },
    {
      name: 'Architecton',
      role: 'ARCHITECTON' as const,
      description: 'Arquiteto de sistemas. Define estruturas e padroes de projeto.',
      skills: ['arquitetura', 'design patterns', 'banco de dados', 'infraestrutura'],
    },
    {
      name: 'Pixel',
      role: 'PIXEL' as const,
      description: 'Designer de interfaces. Cria layouts e componentes visuais.',
      skills: ['UI/UX', 'design system', 'CSS', 'componentes', 'responsividade'],
    },
    {
      name: 'Finish',
      role: 'FINISH' as const,
      description: 'Especialista em deploy e entrega. Consolida artefatos gerados e publica no Vercel.',
      skills: ['deploy', 'vercel', 'hosting', 'entrega', 'publicacao'],
    },
  ]

  for (const agent of agents) {
    const existing = await prisma.agent.findUnique({ where: { name: agent.name } })
    if (existing) {
      console.log(`Agente ${agent.name} ja existe, pulando...`)
      continue
    }
    const created = await prisma.agent.create({ data: agent })
    console.log(`Agente criado: ${created.name} (${created.role})`)
  }

  const allAgents = await prisma.agent.findMany()
  console.log(`Total de agentes: ${allAgents.length}\n`)

  // ============================================
  // SEED DE TAGS
  // ============================================
  console.log('Iniciando seed das tags...\n')

  const tags = [
    { name: 'Bug',           color: '#EF4444', description: 'Correção de erros e defeitos' },
    { name: 'Feature',       color: '#22C55E', description: 'Nova funcionalidade' },
    { name: 'Improvement',   color: '#3B82F6', description: 'Melhoria em funcionalidade existente' },
    { name: 'Documentation', color: '#8B5CF6', description: 'Documentação e guias' },
    { name: 'Urgent',        color: '#F97316', description: 'Requer atenção imediata' },
    { name: 'Backend',       color: '#6B7280', description: 'Trabalho no servidor e APIs' },
    { name: 'Frontend',      color: '#EC4899', description: 'Trabalho na interface do usuário' },
    { name: 'DevOps',        color: '#EAB308', description: 'Infraestrutura e deploy' },
  ]

  for (const tag of tags) {
    const existing = await prisma.tag.findUnique({ where: { name: tag.name } })
    if (existing) {
      console.log(`Tag ${tag.name} ja existe, pulando...`)
      continue
    }
    const created = await prisma.tag.create({ data: tag })
    console.log(`Tag criada: ${created.name} (${created.color})`)
  }

  const allTags = await prisma.tag.findMany()
  console.log(`Total de tags: ${allTags.length}\n`)

  // ============================================
  // SEED DE TEMPLATES
  // ============================================
  console.log('Iniciando seed dos templates...\n')

  const templates = [
    {
      name: 'Bug Report',
      description: 'Relato e correcao de bugs encontrados no sistema',
      defaultTitle: '[BUG] Descricao do bug',
      defaultDescription: '## Descricao\nDescreva o bug encontrado.\n\n## Passos para Reproduzir\n1. \n2. \n3. \n\n## Comportamento Esperado\n\n\n## Comportamento Atual\n\n\n## Screenshots/Logs\n',
      defaultPriority: 'HIGH' as const,
      defaultAgentRole: 'SENTINEL' as const,
      defaultTags: ['Bug', 'Backend'],
      subtaskTemplates: [
        { title: 'Reproduzir e documentar o bug', priority: 'HIGH' },
        { title: 'Identificar causa raiz', priority: 'HIGH' },
        { title: 'Implementar correcao', priority: 'HIGH' },
        { title: 'Escrever testes de regressao', priority: 'MEDIUM' },
      ],
    },
    {
      name: 'Nova Feature',
      description: 'Planejamento e implementacao de nova funcionalidade',
      defaultTitle: '[FEATURE] Nome da funcionalidade',
      defaultDescription: '## Objetivo\nDescreva o objetivo da feature.\n\n## Requisitos\n- [ ] \n- [ ] \n\n## Criterios de Aceitacao\n- [ ] \n- [ ] \n\n## Design/Mockups\n\n## Notas Tecnicas\n',
      defaultPriority: 'MEDIUM' as const,
      defaultAgentRole: 'MAESTRO' as const,
      defaultTags: ['Feature'],
      subtaskTemplates: [
        { title: 'Definir requisitos detalhados', priority: 'HIGH' },
        { title: 'Criar arquitetura da solucao', priority: 'HIGH' },
        { title: 'Implementar backend/API', priority: 'MEDIUM' },
        { title: 'Implementar frontend/UI', priority: 'MEDIUM' },
        { title: 'Testes e validacao', priority: 'MEDIUM' },
      ],
    },
    {
      name: 'UI Component',
      description: 'Criacao de componente de interface reutilizavel',
      defaultTitle: '[UI] Nome do componente',
      defaultDescription: '## Componente\nDescreva o componente a ser criado.\n\n## Props/API\n\n## Variantes\n\n## Responsividade\n\n## Acessibilidade\n',
      defaultPriority: 'MEDIUM' as const,
      defaultAgentRole: 'PIXEL' as const,
      defaultTags: ['Frontend', 'Feature'],
      subtaskTemplates: [
        { title: 'Design do componente e variantes', priority: 'HIGH' },
        { title: 'Implementar componente base', priority: 'MEDIUM' },
        { title: 'Adicionar responsividade', priority: 'MEDIUM' },
        { title: 'Verificar acessibilidade', priority: 'LOW' },
      ],
    },
    {
      name: 'Security Audit',
      description: 'Auditoria de seguranca do sistema ou modulo',
      defaultTitle: '[SECURITY] Auditoria de seguranca',
      defaultDescription: '## Escopo\nDescreva o escopo da auditoria.\n\n## Checklist OWASP\n- [ ] Injection\n- [ ] Broken Authentication\n- [ ] Sensitive Data Exposure\n- [ ] XXE\n- [ ] Broken Access Control\n- [ ] Security Misconfiguration\n- [ ] XSS\n- [ ] Insecure Deserialization\n- [ ] Using Components with Known Vulnerabilities\n- [ ] Insufficient Logging & Monitoring\n\n## Ferramentas\n\n## Findings\n',
      defaultPriority: 'URGENT' as const,
      defaultAgentRole: 'SENTINEL' as const,
      defaultTags: ['Backend', 'Urgent'],
      subtaskTemplates: [
        { title: 'Analise de vulnerabilidades OWASP Top 10', priority: 'URGENT' },
        { title: 'Revisar autenticacao e autorizacao', priority: 'URGENT' },
        { title: 'Verificar exposicao de dados sensiveis', priority: 'HIGH' },
        { title: 'Gerar relatorio de findings', priority: 'HIGH' },
      ],
    },
    {
      name: 'Refactoring',
      description: 'Refatoracao de codigo para melhorar qualidade e manutenibilidade',
      defaultTitle: '[REFACTOR] Area/modulo a refatorar',
      defaultDescription: '## Motivacao\nPor que esta refatoracao e necessaria?\n\n## Estado Atual\nDescreva o estado atual do codigo.\n\n## Estado Desejado\nDescreva o resultado esperado.\n\n## Riscos\n\n## Plano de Migracao\n',
      defaultPriority: 'MEDIUM' as const,
      defaultAgentRole: 'ARCHITECTON' as const,
      defaultTags: ['Improvement', 'Backend'],
      subtaskTemplates: [
        { title: 'Mapear dependencias e impacto', priority: 'HIGH' },
        { title: 'Definir nova arquitetura', priority: 'HIGH' },
        { title: 'Implementar refatoracao', priority: 'MEDIUM' },
        { title: 'Garantir cobertura de testes', priority: 'MEDIUM' },
      ],
    },
  ]

  for (const tmpl of templates) {
    const existing = await prisma.taskTemplate.findFirst({ where: { name: tmpl.name } })
    if (existing) {
      console.log(`Template ${tmpl.name} ja existe, pulando...`)
      continue
    }
    const created = await prisma.taskTemplate.create({ data: tmpl })
    console.log(`Template criado: ${created.name} (${created.defaultAgentRole})`)
  }

  const allTemplates = await prisma.taskTemplate.findMany()
  console.log(`Total de templates: ${allTemplates.length}`)

  console.log('\nSeed concluido!')
}

seed()
  .catch((e) => { console.error('Erro no seed:', e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
