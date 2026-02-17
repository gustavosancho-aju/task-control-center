# Timeline Component

Componente de linha do tempo profissional para exibir o histórico de mudanças de status de tarefas.

## 📸 Preview

```
◉ REVIEW → DONE              [Atual]
│ há 2 minutos
│ 15 de fevereiro de 2026 às 14:32
│ ┌────────────────────────────────┐
│ │ Tarefa concluída com sucesso  │
│ └────────────────────────────────┘
│
◉ IN_PROGRESS → REVIEW
│ há 2 horas
│ 15 de fevereiro de 2026 às 12:30
│
◉ TODO → IN_PROGRESS
│ há 5 horas
│ 15 de fevereiro de 2026 às 09:30
│
◉ Criação → TODO
  há 1 dia
  14 de fevereiro de 2026 às 14:30
```

## 🎯 Características

- ✅ **Layout vertical** com linha conectora
- ✅ **Círculos coloridos** baseados no status
- ✅ **Datas em português** (date-fns + locale ptBR)
- ✅ **Datas relativas** ("há 2 horas")
- ✅ **Badges de status** com ícones
- ✅ **Notas opcionais** em cards destacados
- ✅ **Ordenação automática** (mais recente primeiro)
- ✅ **Estado vazio** com mensagem
- ✅ **Versão compacta** para espaços menores
- ✅ **Dark mode** totalmente suportado
- ✅ **Responsivo** para mobile

## 📦 Instalação

O componente já está integrado ao projeto. Dependências necessárias:

- `date-fns` - Formatação de datas
- `@/components/ui/card` - shadcn/ui Card
- `@/components/ui/badge` - shadcn/ui Badge
- `@/lib/workflow/state-machine` - Gerenciamento de estados

## 🚀 Uso Básico

```tsx
import { Timeline, type TimelineItem } from '@/components/tasks/Timeline';

const items: TimelineItem[] = [
  {
    id: '1',
    fromStatus: 'IN_PROGRESS',
    toStatus: 'DONE',
    changedAt: new Date().toISOString(),
    notes: 'Tarefa concluída com sucesso!',
  },
  {
    id: '2',
    fromStatus: 'TODO',
    toStatus: 'IN_PROGRESS',
    changedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    notes: null,
  },
];

export function MyComponent() {
  return <Timeline items={items} />;
}
```

## 📝 Interface

### TimelineItem

```typescript
interface TimelineItem {
  id: string;              // Identificador único
  fromStatus: string | null; // Status anterior (null para criação)
  toStatus: string;        // Status atual
  changedAt: string;       // Data ISO 8601
  notes: string | null;    // Notas opcionais
}
```

### Props

```typescript
interface TimelineProps {
  items: TimelineItem[];
}
```

## 🎨 Variantes

### Timeline Completa (Padrão)

Versão completa com todos os detalhes:

```tsx
<Timeline items={items} />
```

**Características:**
- Círculos grandes (32px)
- Data completa + relativa
- Notas em cards destacados
- Badge "Atual" no item mais recente

### Timeline Compacta

Versão compacta para cards ou sidebars:

```tsx
import { TimelineCompact } from '@/components/tasks/Timeline';

<TimelineCompact items={items} />
```

**Características:**
- Círculos pequenos (12px)
- Apenas data relativa
- Sem notas
- Mostra apenas últimos 5 itens

## 🎭 Estados e Cores

| Status      | Cor do Círculo | Cor do Anel |
|-------------|----------------|-------------|
| TODO        | Cinza          | Cinza claro |
| IN_PROGRESS | Azul           | Azul claro  |
| REVIEW      | Amarelo        | Amarelo claro |
| DONE        | Verde          | Verde claro |
| BLOCKED     | Vermelho       | Vermelho claro |

## 📅 Formatação de Datas

### Data Relativa

- Menos de 1 minuto: "agora há pouco"
- Menos de 1 hora: "há X minutos"
- Menos de 24 horas: "há X horas"
- Menos de 7 dias: "há X dias"
- Mais de 7 dias: "dd de MMM"

### Data Completa

Formato: `dd de MMMM de yyyy às HH:mm`

Exemplo: `15 de fevereiro de 2026 às 14:32`

## 🎯 Casos de Uso

### 1. Página de Detalhes da Tarefa

```tsx
import { Timeline } from '@/components/tasks/Timeline';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export function TaskDetailPage({ task }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico</CardTitle>
      </CardHeader>
      <CardContent>
        <Timeline items={task.timeline} />
      </CardContent>
    </Card>
  );
}
```

### 2. Sidebar com Atividade Recente

```tsx
import { TimelineCompact } from '@/components/tasks/Timeline';

export function ActivitySidebar({ recentActivity }) {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Atividade Recente</h3>
      <TimelineCompact items={recentActivity} />
    </div>
  );
}
```

### 3. Modal de Histórico

```tsx
import { Timeline } from '@/components/tasks/Timeline';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function HistoryModal({ open, onClose, items }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Histórico Completo</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto">
          <Timeline items={items} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### 4. Com Dados da API

```tsx
'use client';

import { useState, useEffect } from 'react';
import { Timeline, type TimelineItem } from '@/components/tasks/Timeline';

export function TaskTimeline({ taskId }: { taskId: string }) {
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        const response = await fetch(`/api/tasks/${taskId}/timeline`);
        const data = await response.json();
        setItems(data);
      } catch (error) {
        console.error('Error fetching timeline:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTimeline();
  }, [taskId]);

  if (loading) {
    return <div>Carregando...</div>;
  }

  return <Timeline items={items} />;
}
```

## 🔌 Integração com API

### Estrutura de Resposta Esperada

```json
[
  {
    "id": "timeline-1",
    "fromStatus": "IN_PROGRESS",
    "toStatus": "DONE",
    "changedAt": "2026-02-15T14:32:00.000Z",
    "notes": "Tarefa concluída após revisão"
  },
  {
    "id": "timeline-2",
    "fromStatus": "TODO",
    "toStatus": "IN_PROGRESS",
    "changedAt": "2026-02-15T12:30:00.000Z",
    "notes": null
  }
]
```

### Exemplo de API Route (Next.js)

```typescript
// app/api/tasks/[id]/timeline/route.ts

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const timeline = await db.taskStatusChange.findMany({
    where: { taskId: params.id },
    orderBy: { changedAt: 'desc' },
    select: {
      id: true,
      fromStatus: true,
      toStatus: true,
      changedAt: true,
      notes: true,
    },
  });

  return NextResponse.json(timeline);
}
```

## 🎨 Customização

### Classes CSS Personalizadas

```tsx
<Timeline
  items={items}
  className="custom-timeline"
/>
```

### Modificar Cores

Edite `getStatusColor()` e `getStatusRing()` no arquivo `Timeline.tsx`:

```typescript
function getStatusColor(status: string): string {
  const colorMap: Record<TaskStatus, string> = {
    TODO: 'bg-purple-400',      // Sua cor personalizada
    IN_PROGRESS: 'bg-cyan-500',
    // ...
  };
  return colorMap[status as TaskStatus];
}
```

## 🧪 Testing

```typescript
import { render, screen } from '@testing-library/react';
import { Timeline } from './Timeline';

test('renders timeline items', () => {
  const items = [
    {
      id: '1',
      fromStatus: 'TODO',
      toStatus: 'DONE',
      changedAt: new Date().toISOString(),
      notes: 'Test note',
    },
  ];

  render(<Timeline items={items} />);

  expect(screen.getByText('Test note')).toBeInTheDocument();
});

test('renders empty state', () => {
  render(<Timeline items={[]} />);

  expect(
    screen.getByText('Nenhuma mudança de status registrada ainda.')
  ).toBeInTheDocument();
});
```

## 🌐 Internacionalização

Atualmente suporta apenas português (pt-BR). Para adicionar outros idiomas:

1. Importe o locale do date-fns
2. Modifique as funções `formatDate()` e `formatRelativeDate()`
3. Atualize os textos estáticos

## ♿ Acessibilidade

- ✅ Marcação semântica apropriada
- ✅ Linha decorativa com `aria-hidden="true"`
- ✅ Contraste adequado (WCAG AA)
- ✅ Suporte a leitores de tela

## 📱 Responsividade

O componente é totalmente responsivo e se adapta a diferentes tamanhos de tela:

- **Mobile**: Layout vertical compacto
- **Tablet**: Layout vertical padrão
- **Desktop**: Layout vertical expandido

## 🐛 Troubleshooting

### Datas não formatadas corretamente

Certifique-se de que está passando strings ISO 8601:

```typescript
changedAt: new Date().toISOString() // ✅ Correto
changedAt: new Date()                // ❌ Errado
```

### Status customizados não aparecem

Use `isValidStatus()` para validar antes de usar:

```typescript
import { isValidStatus } from '@/lib/workflow/state-machine';

if (isValidStatus(status)) {
  // Status válido
} else {
  // Status customizado - use fallback
}
```

## 📚 Exemplos Completos

Veja `Timeline.example.tsx` para 8 exemplos completos de uso.

---

**Desenvolvido para Task Control Center** 🚀
