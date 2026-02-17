# TaskAnalysisCard Component

Componente para exibir análise de tarefas gerada por IA com sugestões de agente, estimativa de horas, complexidade e tags.

## 📦 Props

```typescript
interface TaskAnalysisCardProps {
  analysis: TaskAnalysis | null;      // Resultado da análise da IA
  loading: boolean;                    // Estado de carregamento
  onApplySuggestion?: (field: string, value: any) => void; // Callback para aplicar sugestões
}
```

### TaskAnalysis Type

```typescript
interface TaskAnalysis {
  suggestedAgent: 'MAESTRO' | 'SENTINEL' | 'ARCHITECTON' | 'PIXEL';
  estimatedHours: number;
  complexity: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
  tags: string[];
  reasoning: string;
}
```

## 🎨 Features

### 1. **Estados Visuais**

- ✅ **Empty State**: Mensagem instruindo o usuário a clicar em "Analisar"
- ✅ **Loading State**: Skeleton/spinner animado durante análise
- ✅ **Success State**: Exibe análise completa com todas as informações

### 2. **Informações Exibidas**

- 🎯 **Agente Sugerido**: Badge com emoji e nome do agente
  - MAESTRO 🎯: Orquestrador
  - SENTINEL 🛡️: Qualidade
  - ARCHITECTON 🏗️: Arquiteto
  - PIXEL 🎨: Designer

- ⏱️ **Horas Estimadas**: Tempo previsto para conclusão

- 📊 **Complexidade**: Badge colorido
  - LOW (Baixa): Verde
  - MEDIUM (Média): Amarelo
  - HIGH (Alta): Laranja
  - VERY_HIGH (Muito Alta): Vermelho

- 🏷️ **Tags**: Lista de tags relevantes como badges

- 💭 **Raciocínio**: Explicação da IA sobre a análise

### 3. **Interatividade**

- ✨ **Botão "Aplicar Sugestões"**: Chama `onApplySuggestion` para cada campo
  - Aplica agente sugerido
  - Aplica horas estimadas
  - Aplica tags geradas

## 🚀 Uso Básico

```tsx
import { TaskAnalysisCard } from '@/components/ai/TaskAnalysisCard';
import { useState } from 'react';

function TaskForm() {
  const [analysis, setAnalysis] = useState<TaskAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    setLoading(true);

    const response = await fetch('/api/ai/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: taskTitle,
        description: taskDescription
      }),
    });

    const result = await response.json();
    setAnalysis(result.data);
    setLoading(false);
  };

  const handleApplySuggestion = (field: string, value: any) => {
    if (field === 'agent') {
      setSelectedAgent(value);
    }
    if (field === 'estimatedHours') {
      setEstimatedHours(value);
    }
    if (field === 'tags') {
      setTags(value);
    }
  };

  return (
    <div>
      <button onClick={handleAnalyze}>Analisar Tarefa</button>

      <TaskAnalysisCard
        analysis={analysis}
        loading={loading}
        onApplySuggestion={handleApplySuggestion}
      />
    </div>
  );
}
```

## 📋 Exemplos de Estados

### Empty State

```tsx
<TaskAnalysisCard
  analysis={null}
  loading={false}
/>
```

**Renderiza:**
```
┌─────────────────────────────────┐
│ ✨ Análise IA                   │
├─────────────────────────────────┤
│         ✨                       │
│  Clique em Analisar para        │
│  obter sugestões da IA          │
└─────────────────────────────────┘
```

### Loading State

```tsx
<TaskAnalysisCard
  analysis={null}
  loading={true}
/>
```

**Renderiza:**
```
┌─────────────────────────────────┐
│ ⭕ Análise IA                   │
├─────────────────────────────────┤
│ [Skeleton animado]              │
│ [Skeleton animado]              │
│ [Skeleton animado]              │
└─────────────────────────────────┘
```

### Success State

```tsx
<TaskAnalysisCard
  analysis={{
    suggestedAgent: 'ARCHITECTON',
    estimatedHours: 12,
    complexity: 'HIGH',
    tags: ['oauth', 'security', 'backend'],
    reasoning: 'Esta tarefa envolve decisões arquiteturais...',
  }}
  loading={false}
  onApplySuggestion={handleApply}
/>
```

**Renderiza:**
```
┌─────────────────────────────────┐
│ ✨ Análise IA                   │
├─────────────────────────────────┤
│ ✓ Análise concluída             │
│                                 │
│ 🎯 Agente Sugerido              │
│ [🏗️ Architecton - Arquiteto]   │
│                                 │
│ ⏱️ Horas Estimadas              │
│ 12h                             │
│                                 │
│ 📊 Complexidade                 │
│ [Alta] (laranja)                │
│                                 │
│ 🏷️ Tags                         │
│ [oauth] [security] [backend]    │
│                                 │
│ 💭 Raciocínio                   │
│ Esta tarefa envolve decisões... │
│                                 │
│ [✨ Aplicar Sugestões]          │
└─────────────────────────────────┘
```

## 🎨 Cores das Complexidades

| Complexidade | Label | Cor | Classe Tailwind |
|--------------|-------|-----|-----------------|
| LOW | Baixa | Verde | `bg-green-500/10 text-green-600` |
| MEDIUM | Média | Amarelo | `bg-yellow-500/10 text-yellow-600` |
| HIGH | Alta | Laranja | `bg-orange-500/10 text-orange-600` |
| VERY_HIGH | Muito Alta | Vermelho | `bg-red-500/10 text-red-600` |

## 🔌 Integração com API

### Endpoint: POST /api/ai/analyze

```typescript
// Request
{
  "title": "Implementar autenticação OAuth",
  "description": "Adicionar login com Google e GitHub"
}

// Response
{
  "success": true,
  "data": {
    "suggestedAgent": "ARCHITECTON",
    "estimatedHours": 12,
    "complexity": "HIGH",
    "tags": ["oauth", "authentication", "security"],
    "reasoning": "Esta tarefa envolve..."
  }
}
```

## 🧩 Composição

O componente usa:
- `Card`, `CardHeader`, `CardTitle`, `CardContent` - shadcn/ui
- `Badge` - shadcn/ui
- `Button` - shadcn/ui
- `Skeleton` - shadcn/ui
- Ícones do `lucide-react`:
  - `Sparkles` - IA/Análise
  - `Clock` - Horas
  - `Target` - Agente
  - `CheckCircle2` - Sucesso

## 🎯 Callback onApplySuggestion

O callback recebe dois parâmetros:
1. `field`: Nome do campo ('agent', 'estimatedHours', 'tags')
2. `value`: Valor a ser aplicado

```typescript
const handleApplySuggestion = (field: string, value: any) => {
  switch (field) {
    case 'agent':
      // value: 'MAESTRO' | 'SENTINEL' | 'ARCHITECTON' | 'PIXEL'
      setSelectedAgent(value);
      break;
    case 'estimatedHours':
      // value: number
      setEstimatedHours(value);
      break;
    case 'tags':
      // value: string[]
      setTags(value);
      break;
  }
};
```

## 📝 Observações

- O componente é **client-side only** (`'use client'`)
- Design responsivo com gradiente roxo sutil
- Animações suaves para transições
- Acessível com semântica adequada
- Totalmente tipado com TypeScript

## 📚 Arquivos Relacionados

- `components/ai/TaskAnalysisCard.tsx` - Componente principal
- `components/ai/TaskAnalysisCard.example.tsx` - Exemplos de uso
- `types/ai.ts` - Tipos TypeScript
- `app/api/ai/analyze/route.ts` - Endpoint da API

---

**Desenvolvido para Task Control Center** 🚀
