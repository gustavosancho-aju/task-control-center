import { createClaudeJsonMessage } from './claude-client';
import type { TaskAnalysis, SubtaskSuggestion, TaskImprovement } from '@/types/ai';

// ============================================================================
// AGENT CONTEXT
// ============================================================================

const AGENT_CONTEXT = `
Você está analisando tarefas de desenvolvimento de software. Conheça os 4 agentes disponíveis:

**MAESTRO** - Orquestrador
- Planejamento e coordenação de projetos
- Gestão de múltiplas tarefas e dependências
- Definição de estratégias e roadmaps
- Coordenação entre diferentes áreas

**SENTINEL** - Guardião da Qualidade
- Code review e análise de código
- Testes (unitários, integração, E2E)
- Segurança e vulnerabilidades
- Performance e otimização
- Padrões e best practices

**ARCHITECTON** - Arquiteto
- Arquitetura de sistemas e aplicações
- Design de banco de dados e modelagem
- Infraestrutura e DevOps
- Integrações e APIs
- Decisões técnicas estruturais

**PIXEL** - Designer de Interface
- UI/UX e design de interfaces
- Componentes visuais e layouts
- CSS, estilização e responsividade
- Design systems e padrões visuais
- Acessibilidade e experiência do usuário
`.trim();

// ============================================================================
// ANALYZE TASK
// ============================================================================

/**
 * Analyzes a task using Claude AI and suggests the most appropriate agent,
 * estimated hours, complexity level, and relevant tags.
 *
 * @param title - Task title
 * @param description - Optional task description
 * @returns TaskAnalysis object or null if analysis fails
 */
export async function analyzeTask(
  title: string,
  description?: string
): Promise<TaskAnalysis | null> {
  try {
    const systemPrompt = `${AGENT_CONTEXT}

Sua tarefa é analisar a tarefa fornecida e retornar uma análise estruturada em JSON.

Regras:
1. Sugira o agente mais apropriado baseado no tipo de trabalho
2. Estime horas de forma realista (considere complexidade e escopo)
3. Avalie complexidade: LOW (1-2h), MEDIUM (3-8h), HIGH (9-16h), VERY_HIGH (>16h)
4. Gere tags relevantes e específicas (máximo 5)
5. Explique brevemente o raciocínio da análise

SEMPRE retorne JSON válido no seguinte formato:
{
  "suggestedAgent": "MAESTRO" | "SENTINEL" | "ARCHITECTON" | "PIXEL",
  "estimatedHours": number,
  "complexity": "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH",
  "tags": string[],
  "reasoning": string
}`;

    const prompt = `Analise esta tarefa:

**Título:** ${title}
**Descrição:** ${description || 'Sem descrição fornecida'}

Retorne a análise em JSON.`;

    const analysis = await createClaudeJsonMessage<TaskAnalysis>(prompt, systemPrompt);

    return analysis;
  } catch (error) {
    console.error('Error analyzing task:', error);
    return null;
  }
}

// ============================================================================
// SUGGEST SUBTASKS
// ============================================================================

/**
 * Suggests subtasks for breaking down a complex task into smaller,
 * manageable pieces.
 *
 * @param title - Task title
 * @param description - Optional task description
 * @returns Array of SubtaskSuggestion or null if suggestion fails
 */
export async function suggestSubtasks(
  title: string,
  description?: string
): Promise<SubtaskSuggestion[] | null> {
  try {
    const systemPrompt = `Você é um especialista em decompor tarefas de desenvolvimento de software.

Sua tarefa é quebrar a tarefa fornecida em subtarefas menores e gerenciáveis.

Regras:
1. Gere no máximo 5 subtarefas
2. Cada subtarefa deve ser independente e completável
3. Cubra todos os aspectos da tarefa principal
4. Defina prioridade apropriada: LOW, MEDIUM, HIGH, URGENT
5. Estime horas realistas para cada subtarefa
6. Seja específico nos títulos e descrições

SEMPRE retorne JSON válido com array de subtarefas:
[
  {
    "title": string,
    "description": string,
    "priority": "LOW" | "MEDIUM" | "HIGH" | "URGENT",
    "estimatedHours": number
  }
]`;

    const prompt = `Decomponha esta tarefa em subtarefas:

**Título:** ${title}
**Descrição:** ${description || 'Sem descrição fornecida'}

Retorne array de subtarefas em JSON (máximo 5).`;

    const subtasks = await createClaudeJsonMessage<SubtaskSuggestion[]>(prompt, systemPrompt);

    // Validate and limit to 5 subtasks
    if (!Array.isArray(subtasks)) {
      console.error('Invalid subtasks response: not an array');
      return null;
    }

    return subtasks.slice(0, 5);
  } catch (error) {
    console.error('Error suggesting subtasks:', error);
    return null;
  }
}

// ============================================================================
// IMPROVE TASK DESCRIPTION
// ============================================================================

/**
 * Improves a task's title and description to make it more clear,
 * complete, and actionable.
 *
 * @param title - Current task title
 * @param description - Current task description
 * @returns TaskImprovement object or null if improvement fails
 */
export async function improveTaskDescription(
  title: string,
  description?: string
): Promise<TaskImprovement | null> {
  try {
    const systemPrompt = `Você é um especialista em documentação de tarefas de desenvolvimento.

Sua tarefa é melhorar o título e descrição de tarefas para torná-las mais claras e completas.

Regras para o título:
1. Seja específico e acionável (use verbos como "Implementar", "Corrigir", "Criar")
2. Máximo de 100 caracteres
3. Evite termos genéricos ("Fix bug" → "Corrigir bug de navegação na página de detalhes")

Regras para a descrição:
1. Inclua contexto claro do problema/necessidade
2. Defina objetivos específicos
3. Liste critérios de aceitação quando possível
4. Seja estruturado e organize as informações
5. Evite ambiguidades

Regras para sugestões:
1. Explique o que foi melhorado e por quê
2. Liste 3-5 melhorias específicas
3. Seja construtivo e educativo

SEMPRE retorne JSON válido:
{
  "improvedTitle": string,
  "improvedDescription": string,
  "suggestions": string[]
}`;

    const prompt = `Melhore esta tarefa:

**Título Atual:** ${title}
**Descrição Atual:** ${description || 'Sem descrição'}

Retorne as melhorias em JSON.`;

    const improvement = await createClaudeJsonMessage<TaskImprovement>(prompt, systemPrompt);

    return improvement;
  } catch (error) {
    console.error('Error improving task description:', error);
    return null;
  }
}

// ============================================================================
// BULK ANALYSIS
// ============================================================================

/**
 * Analyzes multiple tasks in a single batch.
 * More efficient than calling analyzeTask multiple times.
 *
 * @param tasks - Array of tasks with title and optional description
 * @returns Array of TaskAnalysis or null for failed analyses
 */
export async function analyzeBulkTasks(
  tasks: Array<{ title: string; description?: string }>
): Promise<Array<TaskAnalysis | null>> {
  const results: Array<TaskAnalysis | null> = [];

  // Process tasks sequentially to avoid rate limits
  for (const task of tasks) {
    const analysis = await analyzeTask(task.title, task.description);
    results.push(analysis);

    // Small delay to avoid hitting rate limits
    if (tasks.length > 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return results;
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validates if a TaskAnalysis object has all required fields
 */
export function isValidTaskAnalysis(analysis: any): analysis is TaskAnalysis {
  return (
    analysis !== null &&
    typeof analysis === 'object' &&
    ['MAESTRO', 'SENTINEL', 'ARCHITECTON', 'PIXEL'].includes(analysis.suggestedAgent) &&
    typeof analysis.estimatedHours === 'number' &&
    analysis.estimatedHours > 0 &&
    ['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'].includes(analysis.complexity) &&
    Array.isArray(analysis.tags) &&
    typeof analysis.reasoning === 'string'
  );
}

/**
 * Validates if a SubtaskSuggestion object has all required fields
 */
export function isValidSubtask(subtask: any): subtask is SubtaskSuggestion {
  return (
    subtask !== null &&
    typeof subtask === 'object' &&
    typeof subtask.title === 'string' &&
    subtask.title.length > 0 &&
    typeof subtask.description === 'string' &&
    ['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(subtask.priority) &&
    typeof subtask.estimatedHours === 'number' &&
    subtask.estimatedHours > 0
  );
}

/**
 * Validates if a TaskImprovement object has all required fields
 */
export function isValidImprovement(improvement: any): improvement is TaskImprovement {
  return (
    improvement !== null &&
    typeof improvement === 'object' &&
    typeof improvement.improvedTitle === 'string' &&
    improvement.improvedTitle.length > 0 &&
    typeof improvement.improvedDescription === 'string' &&
    improvement.improvedDescription.length > 0 &&
    Array.isArray(improvement.suggestions) &&
    improvement.suggestions.every((s: any) => typeof s === 'string')
  );
}
