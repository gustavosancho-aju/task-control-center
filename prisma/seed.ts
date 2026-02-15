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

  console.log('\nSeed concluido!')
  const allAgents = await prisma.agent.findMany()
  console.log(`Total de agentes: ${allAgents.length}`)
}

seed()
  .catch((e) => { console.error('Erro no seed:', e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
