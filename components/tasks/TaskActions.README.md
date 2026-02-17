# TaskActions Component

Componente de ações para gerenciar transições de status de tarefas com base no workflow state machine.

## 🎯 Características

- ✅ **Ações baseadas no state machine** - Usa `getNextActions()` automaticamente
- ✅ **Loading state** - Indicador de carregamento durante execução
- ✅ **Desabilita outros botões** durante loading
- ✅ **Tratamento de erros** - Exibe mensagens de erro
- ✅ **Status DONE especial** - Badge com check ao invés de botões
- ✅ **Status BLOCKED especial** - Badge + botões de desbloqueio
- ✅ **Variants corretos** - default, secondary, destructive
- ✅ **Labels em português** - Textos traduzidos
- ✅ **3 variantes** - Normal, Compact, Dropdown
- ✅ **TypeScript** - Totalmente tipado

## 📦 Props

### TaskActions (Principal)

```typescript
interface TaskActionsProps {
  taskId: string;              // ID da tarefa
  currentStatus: TaskStatus;   // Status atual da tarefa
  onAction: (taskId: string, newStatus: string) => Promise<void>; // Callback
  disabled?: boolean;          // Desabilitar todos os botões
  className?: string;          // Classes CSS adicionais
}
```

### TaskActionsCompact

```typescript
interface TaskActionsCompactProps {
  taskId: string;
  currentStatus: TaskStatus;
  onAction: (taskId: string, newStatus: string) => Promise<void>;
  disabled?: boolean;
  className?: string;
}
```

### TaskActionsDropdown

```typescript
interface TaskActionsDropdownProps {
  taskId: string;
  currentStatus: TaskStatus;
  onAction: (taskId: string, newStatus: string) => Promise<void>;
  disabled?: boolean;
}
```

## 🚀 Uso Básico

```tsx
import { TaskActions } from '@/components/tasks/TaskActions';
import type { TaskStatus } from '@/lib/workflow/state-machine';

export function TaskDetail({ task }) {
  const handleAction = async (taskId: string, newStatus: string) => {
    // Call your API
    const response = await fetch(`/api/tasks/${taskId}/transition`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetStatus: newStatus }),
    });

    if (!response.ok) {
      throw new Error('Failed to update task');
    }

    // Update local state or refetch
  };

  return (
    <div>
      <h1>{task.title}</h1>
      <TaskActions
        taskId={task.id}
        currentStatus={task.status}
        onAction={handleAction}
      />
    </div>
  );
}
```

## 🎨 Variantes

### 1. TaskActions (Normal)

Versão completa com botões grandes e mensagens de erro.

**Quando usar:**
- Páginas de detalhes de tarefas
- Modais de edição
- Dashboards principais

```tsx
<TaskActions
  taskId="task-123"
  currentStatus="IN_PROGRESS"
  onAction={handleAction}
/>
```

**Renderiza:**
- Botões tamanho `default`
- Mensagens de erro visíveis
- Loading spinner nos botões

---

### 2. TaskActionsCompact

Versão compacta para uso em tabelas e listas.

**Quando usar:**
- Tabelas de tarefas
- Cards de tarefas
- Listas compactas

```tsx
<TaskActionsCompact
  taskId="task-123"
  currentStatus="TODO"
  onAction={handleAction}
/>
```

**Renderiza:**
- Botões tamanho `xs`
- Sem mensagens de erro
- Layout horizontal compacto

---

### 3. TaskActionsDropdown

Versão dropdown para espaços muito limitados.

**Quando usar:**
- Linhas de tabela muito estreitas
- Mobile layouts
- Menus contextuais

```tsx
<TaskActionsDropdown
  taskId="task-123"
  currentStatus="REVIEW"
  onAction={handleAction}
/>
```

**Renderiza:**
- Botão "Ações"
- Menu dropdown com opções
- Fecha automaticamente após ação

## 🎭 Comportamento por Status

### TODO

**Ações disponíveis:**
- ✅ **Iniciar Tarefa** (default) → IN_PROGRESS
- ⛔ **Bloquear** (destructive) → BLOCKED

**Renderiza:**
```tsx
<Button variant="default">Iniciar Tarefa</Button>
<Button variant="destructive">Bloquear</Button>
```

---

### IN_PROGRESS

**Ações disponíveis:**
- ✅ **Enviar para Revisão** (default) → REVIEW
- 🔄 **Voltar para Fila** (secondary) → TODO
- ⛔ **Bloquear** (destructive) → BLOCKED

**Renderiza:**
```tsx
<Button variant="default">Enviar para Revisão</Button>
<Button variant="secondary">Voltar para Fila</Button>
<Button variant="destructive">Bloquear</Button>
```

---

### REVIEW

**Ações disponíveis:**
- ✅ **Concluir** (default) → DONE
- 🔄 **Solicitar Alterações** (secondary) → IN_PROGRESS
- ⛔ **Bloquear** (destructive) → BLOCKED

**Renderiza:**
```tsx
<Button variant="default">Concluir</Button>
<Button variant="secondary">Solicitar Alterações</Button>
<Button variant="destructive">Bloquear</Button>
```

---

### DONE ✅

**Comportamento especial:** Não renderiza botões, apenas badge.

**Renderiza:**
```tsx
<Badge variant="outline">
  <CheckCircle2 /> ◉ Concluído
</Badge>
```

---

### BLOCKED 🔒

**Comportamento especial:** Badge de bloqueio + botões de desbloqueio.

**Ações disponíveis:**
- 🔓 **Desbloquear para Fila** (default) → TODO
- 🔓 **Desbloquear e Retomar** (default) → IN_PROGRESS

**Renderiza:**
```tsx
<Badge variant="destructive">
  <Lock /> ⬢ Bloqueado
</Badge>
<Button variant="default">
  <Unlock /> Desbloquear para Fila
</Button>
<Button variant="default">
  <Unlock /> Desbloquear e Retomar
</Button>
```

## ⚙️ Loading State

Durante a execução de uma ação:

1. **Botão clicado:**
   - Mostra spinner `<Loader2 className="animate-spin" />`
   - Texto permanece visível

2. **Outros botões:**
   - São desabilitados
   - `disabled={true}`

3. **Após conclusão:**
   - Todos os botões voltam ao normal
   - Loading state é limpo

```tsx
// Executando ação "Iniciar Tarefa"
<Button disabled>
  <Loader2 className="animate-spin" />
  Iniciar Tarefa
</Button>
<Button disabled>Bloquear</Button>
```

## 🚨 Tratamento de Erros

O componente captura e exibe erros:

```tsx
// Se onAction lançar erro
try {
  await onAction(taskId, newStatus);
} catch (err) {
  // Mostra mensagem de erro
}
```

**Renderiza:**
```tsx
<p className="text-sm text-destructive">
  Erro ao executar ação. Tente novamente.
</p>
```

**Como fornecer mensagem customizada:**

```tsx
const handleAction = async (taskId: string, newStatus: string) => {
  const response = await fetch(`/api/tasks/${taskId}`, {
    method: 'POST',
    body: JSON.stringify({ status: newStatus }),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.message || 'Erro ao atualizar status');
  }
};
```

## 🔌 Integração com API

### Exemplo completo com Next.js

```tsx
'use client';

import { useState } from 'react';
import { TaskActions } from '@/components/tasks/TaskActions';
import type { TaskStatus } from '@/lib/workflow/state-machine';

export function TaskCard({ task }) {
  const [currentStatus, setCurrentStatus] = useState<TaskStatus>(task.status);

  const handleAction = async (taskId: string, newStatus: string) => {
    // POST to API
    const response = await fetch(`/api/tasks/${taskId}/transition`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetStatus: newStatus }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    // Update local state
    setCurrentStatus(newStatus as TaskStatus);

    // Or refetch data
    // mutate(`/api/tasks/${taskId}`);
  };

  return (
    <div>
      <h2>{task.title}</h2>
      <TaskActions
        taskId={task.id}
        currentStatus={currentStatus}
        onAction={handleAction}
      />
    </div>
  );
}
```

### API Route (Next.js App Router)

```typescript
// app/api/tasks/[id]/transition/route.ts

import { NextResponse } from 'next/server';
import { isValidTransition } from '@/lib/workflow/state-machine';
import { db } from '@/lib/db';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { targetStatus } = await request.json();

  // Get current task
  const task = await db.task.findUnique({
    where: { id: params.id },
  });

  if (!task) {
    return NextResponse.json(
      { message: 'Task not found' },
      { status: 404 }
    );
  }

  // Validate transition
  if (!isValidTransition(task.status, targetStatus)) {
    return NextResponse.json(
      {
        message: `Invalid transition from ${task.status} to ${targetStatus}`,
      },
      { status: 400 }
    );
  }

  // Update task
  const updatedTask = await db.task.update({
    where: { id: params.id },
    data: {
      status: targetStatus,
      updatedAt: new Date(),
    },
  });

  return NextResponse.json(updatedTask);
}
```

## 🧪 Testing

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TaskActions } from './TaskActions';

test('renders action buttons for TODO status', () => {
  const mockAction = jest.fn();

  render(
    <TaskActions
      taskId="test-1"
      currentStatus="TODO"
      onAction={mockAction}
    />
  );

  expect(screen.getByText('Iniciar Tarefa')).toBeInTheDocument();
  expect(screen.getByText('Bloquear')).toBeInTheDocument();
});

test('calls onAction when button clicked', async () => {
  const mockAction = jest.fn().mockResolvedValue(undefined);

  render(
    <TaskActions
      taskId="test-1"
      currentStatus="TODO"
      onAction={mockAction}
    />
  );

  const startButton = screen.getByText('Iniciar Tarefa');
  fireEvent.click(startButton);

  await waitFor(() => {
    expect(mockAction).toHaveBeenCalledWith('test-1', 'IN_PROGRESS');
  });
});

test('shows loading state during action', async () => {
  const mockAction = jest.fn(
    () => new Promise((resolve) => setTimeout(resolve, 100))
  );

  render(
    <TaskActions
      taskId="test-1"
      currentStatus="TODO"
      onAction={mockAction}
    />
  );

  const startButton = screen.getByText('Iniciar Tarefa');
  fireEvent.click(startButton);

  // Should show loader
  expect(screen.getByRole('button', { name: /iniciar/i })).toBeDisabled();
});

test('renders badge for DONE status', () => {
  const mockAction = jest.fn();

  render(
    <TaskActions
      taskId="test-1"
      currentStatus="DONE"
      onAction={mockAction}
    />
  );

  expect(screen.getByText(/concluído/i)).toBeInTheDocument();
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});
```

## 📱 Responsividade

O componente se adapta a diferentes tamanhos de tela:

```tsx
// Desktop: botões lado a lado
<div className="flex gap-2">
  <Button>Ação 1</Button>
  <Button>Ação 2</Button>
</div>

// Mobile: quebra automaticamente (flex-wrap)
<div className="flex flex-wrap gap-2">
  <Button>Ação 1</Button>
  <Button>Ação 2</Button>
</div>
```

## ♿ Acessibilidade

- ✅ Botões com labels descritivos
- ✅ Estados disabled apropriados
- ✅ Loading indicado visualmente (spinner)
- ✅ Mensagens de erro legíveis
- ✅ Contraste adequado (WCAG AA)

## 🎨 Customização

### Classes CSS

```tsx
<TaskActions
  taskId="task-1"
  currentStatus="TODO"
  onAction={handleAction}
  className="my-custom-class"
/>
```

### Ícones Personalizados

Edite o arquivo `TaskActions.tsx` e importe seus ícones preferidos do `lucide-react` ou outra biblioteca.

## 📚 Exemplos Completos

Veja `TaskActions.example.tsx` para 7 exemplos completos:

1. Uso básico
2. Todos os status
3. Estado desabilitado
4. Versão compacta em tabela
5. Versão dropdown
6. Com integração de API
7. Página de detalhes

---

**Desenvolvido para Task Control Center** 🚀
