# Claude AI Integration

Integração com a API da Anthropic para análise e sugestões inteligentes de tarefas.

## 📦 Instalação

```bash
npm install @anthropic-ai/sdk
```

## 🔑 Configuração

1. Obtenha sua API key em: https://console.anthropic.com/

2. Adicione ao arquivo `.env`:
   ```env
   ANTHROPIC_API_KEY=sk-ant-api03-sua-chave-aqui
   ```

3. Verifique o arquivo `.env.example` para referência

## 🏗️ Arquitetura

```
lib/ai/
├── claude-client.ts          # Cliente configurado da Anthropic
├── claude-client.example.ts  # Exemplos de uso
└── README.md                 # Esta documentação

types/
└── ai.ts                     # Interfaces TypeScript
```

## 🚀 Uso Básico

### 1. Cliente Claude

```typescript
import { getClaudeClient, createClaudeMessage } from '@/lib/ai/claude-client';

// Obter cliente configurado
const client = getClaudeClient();

// Enviar mensagem simples
const response = await createClaudeMessage(
  'Analise esta tarefa: Implementar login OAuth',
  'Você é um assistente de gerenciamento de projetos'
);
```

### 2. Respostas JSON Estruturadas

```typescript
import { createClaudeJsonMessage } from '@/lib/ai/claude-client';
import type { TaskAnalysis } from '@/types/ai';

const analysis = await createClaudeJsonMessage<TaskAnalysis>(
  'Analise esta tarefa e retorne JSON',
  'System prompt aqui'
);

console.log(analysis.suggestedAgent);   // "MAESTRO" | "SENTINEL" | etc
console.log(analysis.estimatedHours);   // number
console.log(analysis.complexity);       // 1-5
console.log(analysis.tags);             // string[]
```

## 📋 Interfaces Disponíveis

### TaskAnalysis

Análise completa de uma tarefa:

```typescript
interface TaskAnalysis {
  suggestedAgent: 'MAESTRO' | 'SENTINEL' | 'ARCHITECTON' | 'PIXEL' | null;
  estimatedHours: number | null;
  complexity: 1 | 2 | 3 | 4 | 5;
  tags: string[];
  reasoning: string;
}
```

**Exemplo de uso:**
```typescript
import { analyzeTask } from '@/lib/ai/claude-client.example';

const analysis = await analyzeTask(
  'Implementar autenticação OAuth',
  'Adicionar login com Google e GitHub'
);

// Usar sugestão de agente
if (analysis.suggestedAgent) {
  await assignAgent(taskId, analysis.suggestedAgent);
}
```

### SubtaskSuggestion

Sugestões para quebrar uma tarefa em subtarefas:

```typescript
interface SubtaskSuggestion {
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  estimatedHours: number | null;
}
```

**Exemplo de uso:**
```typescript
import { suggestSubtasks } from '@/lib/ai/claude-client.example';

const subtasks = await suggestSubtasks(
  'Migrar para Next.js 16',
  'Atualizar projeto do Next.js 15 para 16',
  5 // máximo de subtarefas
);

// Criar subtarefas automaticamente
for (const subtask of subtasks) {
  await createTask({
    title: subtask.title,
    description: subtask.description,
    priority: subtask.priority,
    estimatedHours: subtask.estimatedHours,
    parentId: mainTaskId,
  });
}
```

### TaskImprovement

Melhorias sugeridas para título e descrição:

```typescript
interface TaskImprovement {
  improvedTitle: string;
  improvedDescription: string;
  suggestions: string[];
}
```

**Exemplo de uso:**
```typescript
import { improveTaskDescription } from '@/lib/ai/claude-client.example';

const improvement = await improveTaskDescription(
  'Fix bug',
  'There is a problem'
);

console.log(improvement.improvedTitle);
// "Fix navigation bug in task detail page"

console.log(improvement.improvedDescription);
// "When clicking on a newly created task, the detail page..."

console.log(improvement.suggestions);
// ["Added specific context about which bug"...]
```

## 🔌 Integração com API Routes

### Criar endpoint de análise

```typescript
// app/api/tasks/[id]/analyze/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { analyzeTask } from '@/lib/ai/claude-client.example';
import prisma from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Buscar tarefa
    const task = await prisma.task.findUnique({
      where: { id },
      select: { title: true, description: true },
    });

    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Tarefa não encontrada' },
        { status: 404 }
      );
    }

    // Analisar com IA
    const analysis = await analyzeTask(
      task.title,
      task.description || ''
    );

    return NextResponse.json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    console.error('AI analysis error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro na análise'
      },
      { status: 500 }
    );
  }
}
```

### Usar no frontend

```typescript
// components/tasks/TaskAnalysisButton.tsx

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { TaskAnalysis } from '@/types/ai';

export function TaskAnalysisButton({ taskId }: { taskId: string }) {
  const [analysis, setAnalysis] = useState<TaskAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/analyze`, {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        setAnalysis(result.data);
      } else {
        console.error('Analysis failed:', result.error);
      }
    } catch (error) {
      console.error('Request failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Button onClick={handleAnalyze} disabled={loading}>
        {loading ? 'Analisando...' : 'Analisar com IA'}
      </Button>

      {analysis && (
        <div className="mt-4">
          <p>Agente sugerido: {analysis.suggestedAgent}</p>
          <p>Horas estimadas: {analysis.estimatedHours}h</p>
          <p>Complexidade: {analysis.complexity}/5</p>
          <p>Tags: {analysis.tags.join(', ')}</p>
          <p>Raciocínio: {analysis.reasoning}</p>
        </div>
      )}
    </div>
  );
}
```

## ⚙️ Configuração Avançada

### Modelo Claude

O cliente está configurado para usar `claude-sonnet-4-20250514`:

```typescript
// lib/ai/claude-client.ts
const CLAUDE_CONFIG = {
  model: 'claude-sonnet-4-20250514',
  maxTokens: 1024,
};
```

### Alterar modelo ou tokens

```typescript
import { getClaudeClient } from '@/lib/ai/claude-client';

const client = getClaudeClient();

const response = await client.messages.create({
  model: 'claude-opus-4-20250514',  // Modelo mais poderoso
  max_tokens: 2048,                  // Mais tokens para respostas longas
  messages: [
    { role: 'user', content: 'Seu prompt aqui' }
  ],
});
```

## 🛡️ Tratamento de Erros

Todas as funções podem lançar erros. Sempre use try/catch:

```typescript
try {
  const analysis = await analyzeTask(title, description);
  // Usar análise
} catch (error) {
  if (error instanceof Error) {
    if (error.message.includes('ANTHROPIC_API_KEY')) {
      console.error('API key não configurada');
    } else if (error.message.includes('parse')) {
      console.error('Resposta inválida do Claude');
    } else {
      console.error('Erro na análise:', error.message);
    }
  }
}
```

## 📚 Recursos

- [Documentação da Anthropic API](https://docs.anthropic.com/)
- [Claude SDK no GitHub](https://github.com/anthropics/anthropic-sdk-typescript)
- [Exemplos de prompts](https://docs.anthropic.com/claude/docs/prompt-engineering)

## 🔐 Segurança

⚠️ **IMPORTANTE:**

- NUNCA comite o arquivo `.env` no Git
- NUNCA exponha a API key no código do frontend
- Sempre faça chamadas à API apenas do lado do servidor (API routes)
- Use variáveis de ambiente para todas as credenciais

## 📝 Próximos Passos

1. Criar endpoint `/api/tasks/[id]/analyze` para análise de tarefas
2. Criar endpoint `/api/tasks/[id]/subtasks` para geração de subtarefas
3. Criar endpoint `/api/tasks/[id]/improve` para melhorias de descrição
4. Adicionar botões "Analisar com IA" na interface
5. Implementar cache de análises para evitar chamadas duplicadas
