# SubtaskSuggestions Component

Componente para exibir sugestões de subtarefas geradas por IA, permitindo criação individual ou em lote.

## 📦 Props

```typescript
interface SubtaskSuggestionsProps {
  suggestions: SubtaskSuggestion[] | null;  // Lista de subtarefas sugeridas
  loading: boolean;                          // Estado de carregamento
  onCreateSubtask: (subtask: SubtaskSuggestion) => Promise<void>;  // Criar subtarefa individual
  onCreateAll: (subtasks: SubtaskSuggestion[]) => Promise<void>;   // Criar todas de uma vez
}
```

### SubtaskSuggestion Type

```typescript
interface SubtaskSuggestion {
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  estimatedHours: number;
}
```

## 🎨 Features

### 1. **Estados Visuais**

- ✅ **Empty State**: Mensagem instruindo a clicar em "Sugerir"
- ✅ **Loading State**: Skeleton animado durante geração das sugestões
- ✅ **Success State**: Exibe lista completa de subtarefas sugeridas

### 2. **Informações Exibidas**

- 📝 **Título**: Nome da subtarefa em destaque (negrito)
- 📄 **Descrição**: Detalhes sobre o que deve ser feito
- 🎯 **Prioridade**: Badge colorido
  - LOW (Baixa): Cinza (slate)
  - MEDIUM (Média): Azul
  - HIGH (Alta): Laranja
  - URGENT (Urgente): Vermelho
- ⏱️ **Horas Estimadas**: Tempo previsto para conclusão

### 3. **Interatividade**

- ✨ **Botão "Criar" Individual**: Cria cada subtarefa separadamente
  - Mostra loading spinner durante criação
  - Desabilita durante operações

- 🚀 **Botão "Criar Todas"**: Cria todas as subtarefas de uma vez
  - Mostra loading spinner e contador
  - Desabilita todos os botões durante operação
  - Localizado no footer do card

### 4. **Contador de Sugestões**

- Exibe quantas subtarefas foram sugeridas
- Ícone de sucesso (CheckCircle2) em verde
- Texto adaptativo: "1 subtarefa sugerida" ou "X subtarefas sugeridas"

## 🚀 Uso Básico

```tsx
import { SubtaskSuggestions } from '@/components/ai/SubtaskSuggestions';
import { useState } from 'react';

function TaskForm() {
  const [suggestions, setSuggestions] = useState<SubtaskSuggestion[] | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSuggest = async () => {
    setLoading(true);

    const response = await fetch('/api/ai/subtasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: taskTitle,
        description: taskDescription,
        maxSubtasks: 5
      }),
    });

    const result = await response.json();
    setSuggestions(result.data);
    setLoading(false);
  };

  const handleCreateSubtask = async (subtask: SubtaskSuggestion) => {
    // Criar subtarefa individual
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: subtask.title,
        description: subtask.description,
        priority: subtask.priority,
        estimatedHours: subtask.estimatedHours,
        status: 'TODO'
      }),
    });

    // Opcional: remover da lista após criar
    setSuggestions(prev => prev?.filter(s => s !== subtask) ?? null);
  };

  const handleCreateAll = async (subtasks: SubtaskSuggestion[]) => {
    // Criar todas as subtarefas em paralelo
    await Promise.all(
      subtasks.map(subtask =>
        fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: subtask.title,
            description: subtask.description,
            priority: subtask.priority,
            estimatedHours: subtask.estimatedHours,
            status: 'TODO'
          }),
        })
      )
    );

    // Limpar sugestões após criar todas
    setSuggestions([]);
  };

  return (
    <div>
      <button onClick={handleSuggest}>Sugerir Subtarefas</button>

      <SubtaskSuggestions
        suggestions={suggestions}
        loading={loading}
        onCreateSubtask={handleCreateSubtask}
        onCreateAll={handleCreateAll}
      />
    </div>
  );
}
```

## 📋 Exemplos de Estados

### Empty State

```tsx
<SubtaskSuggestions
  suggestions={null}
  loading={false}
  onCreateSubtask={handleCreate}
  onCreateAll={handleCreateAll}
/>
```

**Renderiza:**
```
┌─────────────────────────────────┐
│ 📋 Subtarefas Sugeridas         │
├─────────────────────────────────┤
│         📋                       │
│  Clique em Sugerir para obter   │
│  decomposição da tarefa         │
└─────────────────────────────────┘
```

### Loading State

```tsx
<SubtaskSuggestions
  suggestions={null}
  loading={true}
  onCreateSubtask={handleCreate}
  onCreateAll={handleCreateAll}
/>
```

**Renderiza:**
```
┌─────────────────────────────────┐
│ ⭕ Subtarefas Sugeridas         │
├─────────────────────────────────┤
│ [Skeleton animado]              │
│ [Skeleton animado]              │
│ [Skeleton animado]              │
└─────────────────────────────────┘
```

### Success State

```tsx
<SubtaskSuggestions
  suggestions={[
    {
      title: 'Configurar OAuth providers',
      description: 'Configurar Google e GitHub OAuth',
      priority: 'HIGH',
      estimatedHours: 4
    },
    {
      title: 'Implementar callback handlers',
      description: 'Criar endpoints de callback para auth',
      priority: 'HIGH',
      estimatedHours: 3
    }
  ]}
  loading={false}
  onCreateSubtask={handleCreate}
  onCreateAll={handleCreateAll}
/>
```

**Renderiza:**
```
┌─────────────────────────────────────────────┐
│ 📋 Subtarefas Sugeridas                     │
├─────────────────────────────────────────────┤
│ ✓ 2 subtarefas sugeridas                    │
│                                             │
│ ┌───────────────────────────────────────┐   │
│ │ Configurar OAuth providers  [Criar]   │   │
│ │ Configurar Google e GitHub OAuth      │   │
│ │ [Alta] ⏱️ 4h                          │   │
│ └───────────────────────────────────────┘   │
│                                             │
│ ┌───────────────────────────────────────┐   │
│ │ Implementar callback handlers [Criar] │   │
│ │ Criar endpoints de callback para auth │   │
│ │ [Alta] ⏱️ 3h                          │   │
│ └───────────────────────────────────────┘   │
│                                             │
├─────────────────────────────────────────────┤
│        [+ Criar Todas (2)]                  │
└─────────────────────────────────────────────┘
```

## 🎨 Cores das Prioridades

| Prioridade | Label | Cor | Classe Tailwind |
|------------|-------|-----|-----------------|
| LOW | Baixa | Cinza | `bg-slate-500/10 text-slate-600` |
| MEDIUM | Média | Azul | `bg-blue-500/10 text-blue-600` |
| HIGH | Alta | Laranja | `bg-orange-500/10 text-orange-600` |
| URGENT | Urgente | Vermelho | `bg-red-500/10 text-red-600` |

## 🔌 Integração com API

### Endpoint: POST /api/ai/subtasks

```typescript
// Request
{
  "title": "Implementar autenticação OAuth",
  "description": "Adicionar login com Google e GitHub",
  "maxSubtasks": 5
}

// Response
{
  "success": true,
  "data": [
    {
      "title": "Configurar OAuth providers",
      "description": "Configurar Google e GitHub OAuth no projeto",
      "priority": "HIGH",
      "estimatedHours": 4
    },
    {
      "title": "Implementar callback handlers",
      "description": "Criar endpoints de callback para processar autenticação",
      "priority": "HIGH",
      "estimatedHours": 3
    },
    {
      "title": "Criar telas de login",
      "description": "Desenvolver UI para seleção de provider",
      "priority": "MEDIUM",
      "estimatedHours": 2
    }
  ]
}
```

## 🧩 Composição

O componente usa:
- `Card`, `CardHeader`, `CardTitle`, `CardContent`, `CardFooter` - shadcn/ui
- `Badge` - shadcn/ui
- `Button` - shadcn/ui
- `Skeleton` - shadcn/ui
- `Separator` - shadcn/ui
- Ícones do `lucide-react`:
  - `ListTodo` - Lista/Subtarefas
  - `Plus` - Adicionar/Criar
  - `CheckCircle2` - Sucesso
  - `Clock` - Tempo/Horas
  - `Loader2` - Loading/Carregando

## 🎯 Callbacks

### onCreateSubtask

Recebe uma subtarefa individual e deve criar a tarefa no sistema:

```typescript
const handleCreateSubtask = async (subtask: SubtaskSuggestion) => {
  // Chamar API para criar tarefa
  await createTask({
    title: subtask.title,
    description: subtask.description,
    priority: subtask.priority,
    estimatedHours: subtask.estimatedHours,
  });

  // Opcional: atualizar lista local
  setSuggestions(prev => prev?.filter(s => s !== subtask) ?? null);
};
```

### onCreateAll

Recebe array completo de subtarefas e deve criar todas:

```typescript
const handleCreateAll = async (subtasks: SubtaskSuggestion[]) => {
  // Criar todas em paralelo
  await Promise.all(
    subtasks.map(subtask => createTask({
      title: subtask.title,
      description: subtask.description,
      priority: subtask.priority,
      estimatedHours: subtask.estimatedHours,
    }))
  );

  // Limpar lista após criar todas
  setSuggestions([]);
};
```

## 💡 Dicas de Uso

### 1. Vincular Subtarefas à Tarefa Pai

```typescript
const handleCreateSubtask = async (subtask: SubtaskSuggestion) => {
  await fetch('/api/tasks', {
    method: 'POST',
    body: JSON.stringify({
      ...subtask,
      parentTaskId: currentTask.id,  // Vincular à tarefa principal
      status: 'TODO'
    })
  });
};
```

### 2. Remover da Lista Após Criar

```typescript
const handleCreateSubtask = async (subtask: SubtaskSuggestion) => {
  await createTask(subtask);

  // Remover apenas a criada
  setSuggestions(prev =>
    prev?.filter(s => s.title !== subtask.title) ?? null
  );
};
```

### 3. Feedback Visual com Toast

```typescript
import { toast } from '@/components/ui/use-toast';

const handleCreateAll = async (subtasks: SubtaskSuggestion[]) => {
  try {
    await Promise.all(subtasks.map(createTask));

    toast({
      title: 'Subtarefas criadas!',
      description: `${subtasks.length} subtarefas foram adicionadas ao projeto.`,
    });

    setSuggestions([]);
  } catch (error) {
    toast({
      title: 'Erro ao criar subtarefas',
      description: 'Tente novamente mais tarde.',
      variant: 'destructive',
    });
  }
};
```

### 4. Integração com Modal de Edição

```typescript
const handleCreateSubtask = async (subtask: SubtaskSuggestion) => {
  // Abrir modal para editar antes de criar
  setEditingSubtask(subtask);
  setModalOpen(true);
};
```

## 📝 Observações

- O componente é **client-side only** (`'use client'`)
- Design responsivo com gradiente azul sutil
- Animações suaves para transições e hover states
- Loading states independentes para cada botão
- Desabilita todos os botões durante operações async
- Acessível com semântica adequada
- Totalmente tipado com TypeScript

## 🔄 Estados de Loading

O componente gerencia dois estados de loading separados:

1. **creatingIndex** (número | null): Índice da subtarefa sendo criada individualmente
2. **creatingAll** (boolean): Flag para indicar criação em lote

Isso permite:
- Mostrar spinner apenas no botão da subtarefa sendo criada
- Desabilitar todos os botões durante criação em lote
- UX clara sobre o que está acontecendo

## 📚 Arquivos Relacionados

- `components/ai/SubtaskSuggestions.tsx` - Componente principal
- `components/ai/SubtaskSuggestions.example.tsx` - Exemplos de uso
- `types/ai.ts` - Tipos TypeScript
- `app/api/ai/subtasks/route.ts` - Endpoint da API
- `lib/ai/task-analyzer.ts` - Lógica de análise com Claude

---

**Desenvolvido para Task Control Center** 🚀
