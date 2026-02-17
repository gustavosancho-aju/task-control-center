# AgentSelector Component

Componente de seleção de agentes para atribuir responsáveis às tarefas.

## 🎯 Características

- ✅ **Busca automática de agentes** via GET /api/agents
- ✅ **Dropdown com Select** (shadcn/ui)
- ✅ **Opção "Sem agente"** no topo
- ✅ **Emojis por role** - Visual e intuitivo
- ✅ **Agente atual pré-selecionado**
- ✅ **Loading states** - Busca e atribuição
- ✅ **Tratamento de erros** - Mensagens claras
- ✅ **3 variantes** - Normal, Compact, Badge
- ✅ **TypeScript** - Totalmente tipado

## 📦 Props

### AgentSelector (Principal)

```typescript
interface AgentSelectorProps {
  taskId: string;                    // ID da tarefa
  currentAgentId: string | null;     // Agente atual (null = sem agente)
  onAssign: (taskId: string, agentId: string) => Promise<void>;
  onRemove: (taskId: string) => Promise<void>;
  disabled?: boolean;                // Desabilitar seletor
  className?: string;                // Classes CSS adicionais
}
```

### AgentSelectorCompact

```typescript
interface AgentSelectorCompactProps {
  taskId: string;
  currentAgentId: string | null;
  onAssign: (taskId: string, agentId: string) => Promise<void>;
  onRemove: (taskId: string) => Promise<void>;
  disabled?: boolean;
}
```

### AgentBadge

```typescript
interface AgentBadgeProps {
  agentId: string | null;
  className?: string;
}
```

## 🎨 Emojis por Role

| Role        | Emoji | Label              |
|-------------|-------|--------------------|
| MAESTRO     | 🎯    | Orquestrador       |
| SENTINEL    | 🛡️    | Revisor/Qualidade  |
| ARCHITECTON | 🏗️    | Arquiteto          |
| PIXEL       | 🎨    | Designer           |

## 🚀 Uso Básico

```tsx
import { AgentSelector } from '@/components/tasks/AgentSelector';

export function TaskDetail({ task }) {
  const handleAssign = async (taskId: string, agentId: string) => {
    // Call your API to assign agent
    const response = await fetch(`/api/tasks/${taskId}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId }),
    });

    if (!response.ok) {
      throw new Error('Failed to assign agent');
    }

    // Update local state or refetch
  };

  const handleRemove = async (taskId: string) => {
    // Call your API to remove agent
    const response = await fetch(`/api/tasks/${taskId}/assign`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to remove agent');
    }

    // Update local state or refetch
  };

  return (
    <div>
      <h1>{task.title}</h1>
      <AgentSelector
        taskId={task.id}
        currentAgentId={task.agentId}
        onAssign={handleAssign}
        onRemove={handleRemove}
      />
    </div>
  );
}
```

## 🎨 Variantes

### 1. AgentSelector (Normal)

Versão completa com mensagens de erro.

**Quando usar:**
- Páginas de detalhes de tarefas
- Modais de edição
- Formulários de criação

```tsx
<AgentSelector
  taskId="task-123"
  currentAgentId={currentAgentId}
  onAssign={handleAssign}
  onRemove={handleRemove}
/>
```

**Renderiza:**
```
┌─────────────────────────────────┐
│ 🎯 Maestro - Agent 01           │ ▼
└─────────────────────────────────┘

Dropdown:
┌─────────────────────────────────┐
│ 👤 Sem agente                   │
├─────────────────────────────────┤
│ 🎯 Maestro - Agent 01          │ ✓
│    Orquestrador                 │
│ 🛡️ Sentinel - Agent 02          │
│    Revisor/Qualidade            │
│ 🏗️ Architecton - Agent 03       │
│    Arquiteto                    │
│ 🎨 Pixel - Agent 04             │
│    Designer                     │
└─────────────────────────────────┘
```

---

### 2. AgentSelectorCompact

Versão compacta para tabelas e listas.

**Quando usar:**
- Tabelas de tarefas
- Listas compactas
- Dashboards

```tsx
<AgentSelectorCompact
  taskId="task-123"
  currentAgentId={currentAgentId}
  onAssign={handleAssign}
  onRemove={handleRemove}
/>
```

**Renderiza:**
```
┌──────────────┐
│ 🎯 Agent 01  │ ▼  (tamanho small)
└──────────────┘
```

---

### 3. AgentBadge (Somente Leitura)

Badge para exibição apenas, sem seleção.

**Quando usar:**
- Exibir agente atribuído (read-only)
- Cards de resumo
- Histórico de tarefas

```tsx
<AgentBadge agentId={task.agentId} />
```

**Renderiza:**
```
🎯 Maestro - Agent 01 (Orquestrador)
```

## 🔄 Fluxo de Seleção

### Atribuir Agente

```
1. Usuário abre o dropdown
2. Seleciona um agente
3. onAssign(taskId, agentId) é chamado
4. Loading state é mostrado
5. API call é feito
6. Sucesso: agente é atualizado
   Erro: mensagem é exibida
```

### Remover Agente

```
1. Usuário abre o dropdown
2. Seleciona "Sem agente"
3. onRemove(taskId) é chamado
4. Loading state é mostrado
5. API call é feito
6. Sucesso: agente é removido
   Erro: mensagem é exibida
```

## ⚙️ Loading States

### Busca Inicial

Ao montar o componente:

```tsx
<div className="flex items-center gap-2">
  <Loader2 className="animate-spin" />
  <span>Carregando agentes...</span>
</div>
```

### Durante Atribuição

Ao executar assign/remove:

```tsx
<SelectTrigger disabled>
  <Loader2 className="animate-spin" />
  <span>Atribuindo...</span>
</SelectTrigger>
```

## 🚨 Tratamento de Erros

O componente captura e exibe erros:

**Erro ao buscar agentes:**
```tsx
<div className="text-sm text-destructive">
  Erro ao buscar agentes
</div>
```

**Erro ao atribuir/remover:**
```tsx
<p className="text-sm text-destructive">
  Erro ao atualizar atribuição de agente
</p>
```

**Como fornecer mensagem customizada:**

```tsx
const handleAssign = async (taskId: string, agentId: string) => {
  const response = await fetch(`/api/tasks/${taskId}/assign`, {
    method: 'POST',
    body: JSON.stringify({ agentId }),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.message || 'Erro ao atribuir agente');
  }
};
```

## 🔌 Integração com API

### Estrutura de Resposta Esperada

**GET /api/agents?active=true**

```json
{
  "success": true,
  "data": [
    {
      "id": "agent-1",
      "name": "Maestro - Agent 01",
      "role": "MAESTRO",
      "description": "Orquestrador principal",
      "isActive": true,
      "skills": ["coordination", "planning"]
    },
    {
      "id": "agent-2",
      "name": "Sentinel - Agent 02",
      "role": "SENTINEL",
      "description": "Revisor de qualidade",
      "isActive": true,
      "skills": ["review", "quality"]
    }
  ]
}
```

### Exemplo de API Route (Assign)

```typescript
// app/api/tasks/[id]/assign/route.ts

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { agentId } = await request.json();

  const task = await db.task.update({
    where: { id: params.id },
    data: {
      agentId,
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({ success: true, data: task });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const task = await db.task.update({
    where: { id: params.id },
    data: {
      agentId: null,
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({ success: true, data: task });
}
```

## 📋 Casos de Uso

### 1. Página de Detalhes da Tarefa

```tsx
import { AgentSelector } from '@/components/tasks/AgentSelector';

export function TaskDetailPage({ task }) {
  const handleAssign = async (taskId: string, agentId: string) => {
    await updateTaskAgent(taskId, agentId);
    // Refetch or update local state
  };

  const handleRemove = async (taskId: string) => {
    await removeTaskAgent(taskId);
    // Refetch or update local state
  };

  return (
    <div>
      <h1>{task.title}</h1>
      <AgentSelector
        taskId={task.id}
        currentAgentId={task.agentId}
        onAssign={handleAssign}
        onRemove={handleRemove}
      />
    </div>
  );
}
```

### 2. Tabela de Tarefas (Compact)

```tsx
import { AgentSelectorCompact } from '@/components/tasks/AgentSelector';

export function TaskTable({ tasks }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Tarefa</th>
          <th>Agente</th>
        </tr>
      </thead>
      <tbody>
        {tasks.map((task) => (
          <tr key={task.id}>
            <td>{task.title}</td>
            <td>
              <AgentSelectorCompact
                taskId={task.id}
                currentAgentId={task.agentId}
                onAssign={handleAssign}
                onRemove={handleRemove}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

### 3. Card de Tarefa (Badge)

```tsx
import { AgentBadge } from '@/components/tasks/AgentSelector';

export function TaskCard({ task }) {
  return (
    <div className="card">
      <h3>{task.title}</h3>
      <div className="meta">
        <AgentBadge agentId={task.agentId} />
      </div>
    </div>
  );
}
```

## 🎛️ Customização

### Classes CSS

```tsx
<AgentSelector
  taskId="task-1"
  currentAgentId={agentId}
  onAssign={handleAssign}
  onRemove={handleRemove}
  className="my-custom-class"
/>
```

### Modificar Emojis

Edite as constantes no arquivo `AgentSelector.tsx`:

```typescript
const AGENT_ROLE_EMOJIS: Record<AgentRole, string> = {
  MAESTRO: '👑',      // Seu emoji personalizado
  SENTINEL: '👮',
  ARCHITECTON: '🏛️',
  PIXEL: '🖌️',
};
```

### Modificar Labels

```typescript
const AGENT_ROLE_LABELS: Record<AgentRole, string> = {
  MAESTRO: 'Líder',           // Seu label personalizado
  SENTINEL: 'Qualidade',
  ARCHITECTON: 'Arquitetura',
  PIXEL: 'Design',
};
```

## 🧪 Testing

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AgentSelector } from './AgentSelector';

// Mock fetch
global.fetch = jest.fn();

test('fetches and displays agents', async () => {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      success: true,
      data: [
        {
          id: 'agent-1',
          name: 'Agent 01',
          role: 'MAESTRO',
          isActive: true,
          skills: [],
        },
      ],
    }),
  });

  render(
    <AgentSelector
      taskId="test-1"
      currentAgentId={null}
      onAssign={jest.fn()}
      onRemove={jest.fn()}
    />
  );

  // Wait for agents to load
  await waitFor(() => {
    expect(screen.getByText(/Agent 01/i)).toBeInTheDocument();
  });
});

test('calls onAssign when agent selected', async () => {
  const mockAssign = jest.fn().mockResolvedValue(undefined);

  render(
    <AgentSelector
      taskId="test-1"
      currentAgentId={null}
      onAssign={mockAssign}
      onRemove={jest.fn()}
    />
  );

  // Open dropdown and select agent
  // ... trigger selection

  await waitFor(() => {
    expect(mockAssign).toHaveBeenCalledWith('test-1', 'agent-1');
  });
});
```

## ♿ Acessibilidade

- ✅ Select nativo do shadcn/ui (acessível por padrão)
- ✅ Labels descritivos para cada agente
- ✅ Estados disabled apropriados
- ✅ Loading indicado visualmente
- ✅ Contraste adequado (WCAG AA)

## 📱 Responsividade

O componente se adapta automaticamente a diferentes tamanhos de tela:

- **Mobile**: Dropdown ocupa largura total disponível
- **Desktop**: Largura ajustável via className

## 🔄 Estado Vazio

### Nenhum agente disponível

```tsx
// Dropdown mostra:
┌─────────────────────────────────┐
│ Nenhum agente disponível        │
└─────────────────────────────────┘
```

### Sem agente atribuído

```tsx
// Badge mostra:
👤 Sem agente
```

## 📚 Exemplos Completos

Veja `AgentSelector.example.tsx` para 7 exemplos completos:

1. Uso básico
2. Estado desabilitado
3. Versão compacta em tabela
4. AgentBadge (somente leitura)
5. Página de detalhes
6. Com integração de API
7. Todas as variantes lado a lado

---

**Desenvolvido para Task Control Center** 🚀
