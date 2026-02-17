# Task Workflow State Machine

Sistema de gerenciamento de estados de tarefas com transições validadas e utilitários para UI.

## 📊 Diagrama de Estados

```
┌─────────┐
│  TODO   │──────────────┐
└────┬────┘              │
     │                   │
     │ start             │ block
     │                   │
     ▼                   ▼
┌────────────┐      ┌──────────┐
│IN_PROGRESS │◄─────┤ BLOCKED  │
└─────┬──────┘      └──────────┘
      │                   ▲
      │ submit_review     │
      │                   │
      ▼                   │
┌─────────┐               │
│ REVIEW  │───────────────┘
└────┬────┘
     │
     │ complete
     │
     ▼
┌─────────┐
│  DONE   │ (final)
└─────────┘
```

## 🔄 Transições Permitidas

| Status Atual   | Pode Ir Para                        |
|----------------|-------------------------------------|
| TODO           | IN_PROGRESS, BLOCKED                |
| IN_PROGRESS    | REVIEW, BLOCKED, TODO               |
| REVIEW         | DONE, IN_PROGRESS, BLOCKED          |
| DONE           | *(nenhuma - estado final)*          |
| BLOCKED        | TODO, IN_PROGRESS                   |

## 🎯 Funcionalidades

### 1. `VALID_TRANSITIONS`

Objeto que define todas as transições válidas:

```typescript
const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  TODO: ['IN_PROGRESS', 'BLOCKED'],
  IN_PROGRESS: ['REVIEW', 'BLOCKED', 'TODO'],
  REVIEW: ['DONE', 'IN_PROGRESS', 'BLOCKED'],
  DONE: [],
  BLOCKED: ['TODO', 'IN_PROGRESS'],
};
```

### 2. `isValidTransition(from, to)`

Valida se uma transição é permitida:

```typescript
isValidTransition('TODO', 'IN_PROGRESS'); // true
isValidTransition('TODO', 'DONE');        // false
isValidTransition('DONE', 'TODO');        // false
```

### 3. `getNextActions(status)`

Retorna ações possíveis a partir de um status:

```typescript
getNextActions('TODO');
// [
//   {
//     action: 'start',
//     targetStatus: 'IN_PROGRESS',
//     label: 'Iniciar Tarefa',
//     variant: 'default'
//   },
//   {
//     action: 'block',
//     targetStatus: 'BLOCKED',
//     label: 'Bloquear',
//     variant: 'destructive'
//   }
// ]
```

#### Ações Disponíveis

| Status Atual | Ação               | Label                      | Variant      | Destino      |
|--------------|-------------------|----------------------------|--------------|--------------|
| TODO         | start             | Iniciar Tarefa             | default      | IN_PROGRESS  |
| TODO         | block             | Bloquear                   | destructive  | BLOCKED      |
| IN_PROGRESS  | submit_review     | Enviar para Revisão        | default      | REVIEW       |
| IN_PROGRESS  | revert_todo       | Voltar para Fila           | secondary    | TODO         |
| IN_PROGRESS  | block             | Bloquear                   | destructive  | BLOCKED      |
| REVIEW       | complete          | Concluir                   | default      | DONE         |
| REVIEW       | request_changes   | Solicitar Alterações       | secondary    | IN_PROGRESS  |
| REVIEW       | block             | Bloquear                   | destructive  | BLOCKED      |
| BLOCKED      | unblock_todo      | Desbloquear para Fila      | default      | TODO         |
| BLOCKED      | unblock_progress  | Desbloquear e Retomar      | default      | IN_PROGRESS  |

### 4. `getStatusInfo(status)`

Retorna informações de exibição:

```typescript
getStatusInfo('TODO');
// {
//   label: 'A Fazer',
//   color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100',
//   icon: '◇'
// }
```

#### Status Info

| Status      | Label          | Ícone | Cor (light/dark)                    |
|-------------|----------------|-------|-------------------------------------|
| TODO        | A Fazer        | ◇     | gray-100/gray-800                   |
| IN_PROGRESS | Em Andamento   | ◈     | blue-100/blue-900                   |
| REVIEW      | Em Revisão     | ◎     | yellow-100/yellow-900               |
| DONE        | Concluído      | ◉     | green-100/green-900                 |
| BLOCKED     | Bloqueado      | ⬢     | red-100/red-900                     |

## 🛠️ Utilitários Adicionais

### `getAllStatuses()`
Retorna array com todos os status possíveis:
```typescript
getAllStatuses(); // ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'BLOCKED']
```

### `isFinalStatus(status)`
Verifica se é um estado final (sem transições):
```typescript
isFinalStatus('DONE');    // true
isFinalStatus('TODO');    // false
```

### `getDefaultStatus()`
Retorna o status padrão para novas tarefas:
```typescript
getDefaultStatus(); // 'TODO'
```

### `isValidStatus(status)`
Valida se uma string é um status válido (type guard):
```typescript
isValidStatus('TODO');     // true
isValidStatus('INVALID');  // false
```

## 📝 Exemplos de Uso

### React Component - Status Badge

```tsx
import { getStatusInfo, type TaskStatus } from '@/lib/workflow/state-machine';

function StatusBadge({ status }: { status: TaskStatus }) {
  const info = getStatusInfo(status);

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${info.color}`}>
      <span>{info.icon}</span>
      <span className="font-medium">{info.label}</span>
    </div>
  );
}
```

### React Component - Action Buttons

```tsx
import { getNextActions, type TaskStatus } from '@/lib/workflow/state-machine';
import { Button } from '@/components/ui/button';

function TaskActions({
  status,
  onAction
}: {
  status: TaskStatus;
  onAction: (action: string, targetStatus: TaskStatus) => void;
}) {
  const actions = getNextActions(status);

  return (
    <div className="flex gap-2">
      {actions.map((action) => (
        <Button
          key={action.action}
          variant={action.variant}
          onClick={() => onAction(action.action, action.targetStatus)}
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
}
```

### Custom Hook - Task Workflow

```tsx
import { useState, useCallback, useMemo } from 'react';
import {
  isValidTransition,
  getNextActions,
  getStatusInfo,
  type TaskStatus
} from '@/lib/workflow/state-machine';

function useTaskWorkflow(taskId: string, initialStatus: TaskStatus = 'TODO') {
  const [status, setStatus] = useState<TaskStatus>(initialStatus);

  const canTransition = useCallback((targetStatus: TaskStatus) => {
    return isValidTransition(status, targetStatus);
  }, [status]);

  const transition = useCallback(async (targetStatus: TaskStatus) => {
    if (!canTransition(targetStatus)) {
      throw new Error(`Invalid transition from ${status} to ${targetStatus}`);
    }

    // API call
    const response = await fetch(`/api/tasks/${taskId}/transition`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetStatus }),
    });

    if (!response.ok) {
      throw new Error('Failed to update task status');
    }

    setStatus(targetStatus);
  }, [taskId, status, canTransition]);

  const availableActions = useMemo(() => getNextActions(status), [status]);
  const statusInfo = useMemo(() => getStatusInfo(status), [status]);

  return {
    status,
    statusInfo,
    availableActions,
    canTransition,
    transition,
  };
}
```

### API Route - Status Transition

```typescript
// app/api/tasks/[id]/transition/route.ts
import { NextResponse } from 'next/server';
import { isValidTransition, isValidStatus } from '@/lib/workflow/state-machine';
import { db } from '@/lib/db';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { targetStatus } = await request.json();

  // Validate status
  if (!isValidStatus(targetStatus)) {
    return NextResponse.json(
      { error: 'Invalid status' },
      { status: 400 }
    );
  }

  // Get current task
  const task = await db.task.findUnique({
    where: { id: params.id }
  });

  if (!task) {
    return NextResponse.json(
      { error: 'Task not found' },
      { status: 404 }
    );
  }

  // Validate transition
  if (!isValidTransition(task.status, targetStatus)) {
    return NextResponse.json(
      {
        error: `Cannot transition from ${task.status} to ${targetStatus}`,
        currentStatus: task.status,
        targetStatus
      },
      { status: 400 }
    );
  }

  // Update task
  const updatedTask = await db.task.update({
    where: { id: params.id },
    data: {
      status: targetStatus,
      updatedAt: new Date()
    }
  });

  return NextResponse.json(updatedTask);
}
```

## 🎨 Integração com UI

### Tailwind Classes

As cores retornadas por `getStatusInfo()` usam classes Tailwind CSS e são compatíveis com dark mode:

```typescript
// Light mode: bg-blue-100 text-blue-800
// Dark mode: dark:bg-blue-900 dark:text-blue-100
```

### Variants de Botões

Os variants retornados por `getNextActions()` são compatíveis com shadcn/ui Button:

- `default`: Ação primária (azul/verde)
- `secondary`: Ação secundária (cinza)
- `destructive`: Ação destrutiva (vermelho)

## 🔒 Segurança

- ✅ Todas as transições são validadas
- ✅ Estados finais não permitem mudanças
- ✅ Type-safe com TypeScript
- ✅ Validação em runtime com `isValidStatus()`

## 📚 TypeScript

```typescript
import type {
  TaskStatus,
  ActionVariant,
  NextAction,
  StatusInfo
} from '@/lib/workflow/state-machine';
```

## 🧪 Testing

Veja exemplos completos em `state-machine.example.ts`.

---

**Desenvolvido para Task Control Center** 🚀
