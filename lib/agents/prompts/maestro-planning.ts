import type { AgentRole, TaskPriority } from '@prisma/client'

// ============================================================================
// TYPES — Formato estendido retornado por este prompt
// (difere de OrchestrationPlan: adiciona id, deliverables, risks, notes)
// ============================================================================

export interface PlanSubtask {
  /** Identificador posicional dentro do plano, e.g. "1.1", "2.3" */
  id: string
  title: string
  description: string
  agent: AgentRole
  estimatedHours: number
  priority: TaskPriority
  /** IDs de outras subtarefas (e.g. ["1.1", "1.2"]) */
  dependsOn: string[]
  /** Artefatos ou resultados esperados */
  deliverables: string[]
}

export interface PlanPhase {
  name: string
  description: string
  subtasks: PlanSubtask[]
}

export interface MaestroPlan {
  analysis: string
  phases: PlanPhase[]
  totalEstimatedHours: number
  risks: string[]
  notes: string
}

export type ParseResult =
  | { success: true; plan: MaestroPlan }
  | { success: false; error: string; raw?: string }

// ============================================================================
// PROMPT TEMPLATE
// ============================================================================

export const MAESTRO_PLANNING_PROMPT = `
Você é o Maestro, o agente orquestrador do Task Control Center.

Sua função é analisar uma tarefa e criar um plano detalhado de execução.

## Agentes Disponíveis:
- MAESTRO: Orquestração e coordenação (você mesmo - use para subtarefas de planejamento)
- ARCHITECTON: Arquitetura, estrutura, banco de dados, APIs, backend
- PIXEL: Design, UI/UX, componentes visuais, CSS, frontend, geração de landing pages
- SENTINEL: Revisão, testes, qualidade, segurança
- FINISH: Deploy e entrega — publica artefatos gerados no Vercel e retorna URL pública

## Regras:
1. Divida a tarefa em subtarefas menores e específicas
2. Cada subtarefa deve ser executável por UM agente
3. Defina dependências claras (o que precisa estar pronto antes)
4. Estime horas realistas
5. Agrupe em fases lógicas
6. A fase final deve sempre incluir revisão do Sentinel
7. Para tarefas de landing page/site/página: use a sequência ARCHITECTON → PIXEL → SENTINEL → FINISH
8. O FINISH deve ser a ÚLTIMA subtarefa, dependendo do SENTINEL, para fazer deploy no Vercel

## Formato de Resposta (JSON):
{
  "analysis": "Análise detalhada da tarefa...",
  "phases": [
    {
      "name": "Fase 1 - Planejamento",
      "description": "...",
      "subtasks": [
        {
          "id": "1.1",
          "title": "Título claro e específico",
          "description": "O que deve ser feito...",
          "agent": "ARCHITECTON",
          "estimatedHours": 2,
          "priority": "HIGH",
          "dependsOn": [],
          "deliverables": ["O que será entregue"]
        }
      ]
    }
  ],
  "totalEstimatedHours": 12,
  "risks": ["Possíveis riscos..."],
  "notes": "Observações adicionais..."
}

## Tarefa a Analisar:
Título: {title}
Descrição: {description}
Prioridade: {priority}

Crie o plano de execução:
`

// ============================================================================
// VALID ENUM VALUES (para validação sem importar Prisma no runtime)
// ============================================================================

const VALID_AGENT_ROLES: readonly AgentRole[] = ['MAESTRO', 'SENTINEL', 'ARCHITECTON', 'PIXEL', 'FINISH']
const VALID_PRIORITIES: readonly TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']

// ============================================================================
// buildPlanningPrompt
// ============================================================================

interface TaskLike {
  title: string
  description?: string | null
  priority: TaskPriority
}

/**
 * Substitui os placeholders {title}, {description} e {priority} no prompt
 * e retorna o texto completo pronto para envio ao modelo.
 */
export function buildPlanningPrompt(task: TaskLike): string {
  return MAESTRO_PLANNING_PROMPT
    .replace('{title}', task.title)
    .replace('{description}', task.description?.trim() || 'Sem descrição fornecida')
    .replace('{priority}', task.priority)
}

// ============================================================================
// parsePlanResponse
// ============================================================================

/**
 * Extrai e valida o JSON de plano retornado pelo modelo.
 *
 * Estratégia de extração (em ordem):
 * 1. Parse direto da string
 * 2. Extrai bloco entre ```json ... ```
 * 3. Extrai o primeiro `{...}` de nível raiz encontrado na string
 *
 * Retorna `{ success: true, plan }` ou `{ success: false, error, raw? }`.
 */
export function parsePlanResponse(response: string): ParseResult {
  const json = _extractJson(response)

  if (json === null) {
    return {
      success: false,
      error: 'Nenhum JSON encontrado na resposta do modelo',
      raw: response.slice(0, 500),
    }
  }

  return _validate(json, response)
}

// ============================================================================
// PRIVATE — JSON extraction
// ============================================================================

function _extractJson(text: string): unknown | null {
  const trimmed = text.trim()

  // 1. Parse direto
  try {
    return JSON.parse(trimmed)
  } catch { /* continua */ }

  // 2. Bloco ```json ... ``` ou ``` ... ```
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (fenceMatch?.[1]) {
    try {
      return JSON.parse(fenceMatch[1])
    } catch { /* continua */ }
  }

  // 3. Primeiro objeto JSON de nível raiz na string
  const start = trimmed.indexOf('{')
  if (start !== -1) {
    // Percorre buscando o fechamento balanceado de chaves
    let depth = 0
    let inString = false
    let escape = false

    for (let i = start; i < trimmed.length; i++) {
      const ch = trimmed[i]

      if (escape) { escape = false; continue }
      if (ch === '\\' && inString) { escape = true; continue }
      if (ch === '"') { inString = !inString; continue }
      if (inString) continue

      if (ch === '{') depth++
      else if (ch === '}') {
        depth--
        if (depth === 0) {
          try {
            return JSON.parse(trimmed.slice(start, i + 1))
          } catch { /* continua */ }
        }
      }
    }
  }

  return null
}

// ============================================================================
// PRIVATE — Validation
// ============================================================================

function _validate(raw: unknown, originalResponse: string): ParseResult {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { success: false, error: 'JSON raiz deve ser um objeto', raw: originalResponse.slice(0, 500) }
  }

  const obj = raw as Record<string, unknown>

  // ── analysis ──────────────────────────────────────────────────────────────
  if (typeof obj.analysis !== 'string' || !obj.analysis.trim()) {
    return { success: false, error: 'Campo "analysis" ausente ou vazio' }
  }

  // ── phases ────────────────────────────────────────────────────────────────
  if (!Array.isArray(obj.phases) || obj.phases.length === 0) {
    return { success: false, error: 'Campo "phases" deve ser um array não vazio' }
  }

  const phases: PlanPhase[] = []

  for (let pi = 0; pi < obj.phases.length; pi++) {
    const phaseRaw = obj.phases[pi] as Record<string, unknown>

    if (typeof phaseRaw?.name !== 'string' || !phaseRaw.name.trim()) {
      return { success: false, error: `Fase ${pi + 1}: campo "name" ausente ou vazio` }
    }

    if (!Array.isArray(phaseRaw.subtasks) || phaseRaw.subtasks.length === 0) {
      return { success: false, error: `Fase "${phaseRaw.name}": "subtasks" deve ser um array não vazio` }
    }

    const subtasks: PlanSubtask[] = []

    for (let si = 0; si < phaseRaw.subtasks.length; si++) {
      const st = phaseRaw.subtasks[si] as Record<string, unknown>
      const ref = `Fase "${phaseRaw.name}", subtarefa ${si + 1}`

      // id (tolerante: aceita ausente e deriva de posição)
      const id = typeof st?.id === 'string' ? st.id : `${pi + 1}.${si + 1}`

      if (typeof st?.title !== 'string' || !st.title.trim()) {
        return { success: false, error: `${ref}: campo "title" ausente ou vazio` }
      }

      if (typeof st?.description !== 'string') {
        return { success: false, error: `${ref}: campo "description" ausente` }
      }

      const agent = st?.agent as string
      if (!VALID_AGENT_ROLES.includes(agent as AgentRole)) {
        return {
          success: false,
          error: `${ref}: "agent" inválido "${agent}" — válidos: ${VALID_AGENT_ROLES.join(', ')}`,
        }
      }

      const hours = Number(st?.estimatedHours)
      if (!isFinite(hours) || hours <= 0) {
        return { success: false, error: `${ref}: "estimatedHours" deve ser um número positivo` }
      }

      const priority = st?.priority as string
      if (!VALID_PRIORITIES.includes(priority as TaskPriority)) {
        return {
          success: false,
          error: `${ref}: "priority" inválida "${priority}" — válidas: ${VALID_PRIORITIES.join(', ')}`,
        }
      }

      const dependsOn = Array.isArray(st?.dependsOn)
        ? (st.dependsOn as unknown[]).filter((d): d is string => typeof d === 'string')
        : []

      const deliverables = Array.isArray(st?.deliverables)
        ? (st.deliverables as unknown[]).filter((d): d is string => typeof d === 'string')
        : []

      subtasks.push({
        id,
        title: st.title as string,
        description: st.description as string,
        agent: agent as AgentRole,
        estimatedHours: hours,
        priority: priority as TaskPriority,
        dependsOn,
        deliverables,
      })
    }

    phases.push({
      name: phaseRaw.name as string,
      description: typeof phaseRaw.description === 'string' ? phaseRaw.description : '',
      subtasks,
    })
  }

  // ── totalEstimatedHours ───────────────────────────────────────────────────
  const totalEstimatedHours = Number(obj.totalEstimatedHours)
  if (!isFinite(totalEstimatedHours) || totalEstimatedHours < 0) {
    // Fallback: soma das subtarefas
    const summed = phases
      .flatMap(p => p.subtasks)
      .reduce((acc, s) => acc + s.estimatedHours, 0)

    return {
      success: true,
      plan: {
        analysis: (obj.analysis as string).trim(),
        phases,
        totalEstimatedHours: summed,
        risks: _toStringArray(obj.risks),
        notes: typeof obj.notes === 'string' ? obj.notes : '',
      },
    }
  }

  // ── risks ────────────────────────────────────────────────────────────────
  const risks = _toStringArray(obj.risks)

  // ── notes ─────────────────────────────────────────────────────────────────
  const notes = typeof obj.notes === 'string' ? obj.notes : ''

  return {
    success: true,
    plan: {
      analysis: (obj.analysis as string).trim(),
      phases,
      totalEstimatedHours,
      risks,
      notes,
    },
  }
}

function _toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((v): v is string => typeof v === 'string')
}
