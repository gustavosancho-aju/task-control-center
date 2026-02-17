# Task Detail Page

Página de detalhes de uma tarefa individual com todas as informações e ações disponíveis.

## 📍 Rota

```
/tasks/[id]
```

**Exemplo:**
```
/tasks/cm5abc123xyz
```

## 🎯 Características

- ✅ **Busca automática** da tarefa via API
- ✅ **Tratamento de 404** quando tarefa não existe
- ✅ **Loading state** durante carregamento
- ✅ **Cabeçalho** com título e badges
- ✅ **Card de informações** com todos os detalhes
- ✅ **AgentSelector** para atribuir/remover agente
- ✅ **TaskActions** para mudar status
- ✅ **Timeline** com histórico de mudanças
- ✅ **Layout responsivo** (desktop e mobile)
- ✅ **Formatação de datas** em português

## 🏗️ Estrutura da Página

### Seção 1: Cabeçalho

```tsx
<Button onClick={goBack}>← Voltar</Button>
<h1>{task.title}</h1>
<StatusBadge status={task.status} />
<PriorityBadge priority={task.priority} />
```

**Renderiza:**
```
← Voltar

Implementar autenticação OAuth
[Em Progresso] [Alta]
```

---

### Seção 2: Card de Informações

**Campos exibidos:**
- Descrição (se existir)
- Data de criação
- Data de conclusão (se existir)
- Prazo (se existir)
- Horas estimadas (se existir)
- Horas reais (se existir)

**Renderiza:**
```
┌─────────────────────────────────┐
│ Informações da Tarefa           │
├─────────────────────────────────┤
│ Descrição                       │
│ Adicionar suporte para login... │
│                                 │
│ 📅 Criada em                    │
│    15 de fevereiro de 2026      │
│                                 │
│ ⏰ Horas Estimadas              │
│    8h                           │
└─────────────────────────────────┘
```

---

### Seção 3: Card de Agente

**Componentes:**
- `<AgentSelector>` para atribuir/remover
- Info do agente atual (se existir)

**Renderiza:**
```
┌─────────────────────────────────┐
│ Agente Responsável              │
├─────────────────────────────────┤
│ [Dropdown para selecionar]      │
│                                 │
│ Agente Atual:                   │
│ 🎯 Maestro - Agent 01           │
└─────────────────────────────────┘
```

---

### Seção 4: Card de Ações

**Componentes:**
- `<TaskActions>` com botões contextuais

**Renderiza:**
```
┌─────────────────────────────────┐
│ Ações da Tarefa                 │
├─────────────────────────────────┤
│ [Enviar para Revisão]           │
│ [Voltar para Fila]              │
│ [Bloquear]                      │
└─────────────────────────────────┘
```

---

### Seção 5: Card de Histórico

**Componentes:**
- `<Timeline>` com statusHistory

**Renderiza:**
```
┌─────────────────────────────────┐
│ Histórico de Mudanças           │
├─────────────────────────────────┤
│ ◉ TODO → IN_PROGRESS [Atual]   │
│   há 2 horas                    │
│                                 │
│ ◉ Criação → TODO                │
│   há 1 dia                      │
└─────────────────────────────────┘
```

---

### Seção 6: Card de Metadados

**Informações:**
- ID da tarefa (formato cuid)
- Última atualização

**Renderiza:**
```
┌─────────────────────────────────┐
│ Metadados                       │
├─────────────────────────────────┤
│ ID da Tarefa                    │
│ cm5abc123xyz                    │
│                                 │
│ Última Atualização              │
│ 15/02/2026 às 14:32             │
└─────────────────────────────────┘
```

## 🔌 Integração com API

### GET /api/tasks/[id]

**Busca os dados da tarefa**

Resposta esperada:
```json
{
  "success": true,
  "data": {
    "id": "cm5abc123xyz",
    "title": "Implementar autenticação OAuth",
    "description": "Adicionar suporte para login com Google e GitHub",
    "status": "IN_PROGRESS",
    "priority": "HIGH",
    "agentId": "agent-1",
    "agentName": "Maestro - Agent 01",
    "createdAt": "2026-02-15T12:00:00.000Z",
    "updatedAt": "2026-02-15T14:30:00.000Z",
    "completedAt": null,
    "dueDate": "2026-02-20T23:59:59.000Z",
    "estimatedHours": 8,
    "actualHours": null,
    "statusHistory": [
      {
        "id": "history-1",
        "fromStatus": "TODO",
        "toStatus": "IN_PROGRESS",
        "changedAt": "2026-02-15T12:30:00.000Z",
        "notes": "Iniciando desenvolvimento"
      },
      {
        "id": "history-2",
        "fromStatus": null,
        "toStatus": "TODO",
        "changedAt": "2026-02-15T12:00:00.000Z",
        "notes": "Tarefa criada"
      }
    ]
  }
}
```

**404 Response:**
```json
{
  "success": false,
  "error": "Task not found"
}
```

---

### PATCH /api/tasks/[id]

**Atualiza o status da tarefa**

Request:
```json
{
  "status": "REVIEW"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "cm5abc123xyz",
    "status": "REVIEW",
    // ... outros campos atualizados
  }
}
```

---

### POST /api/tasks/[id]/assign

**Atribui um agente à tarefa**

Request:
```json
{
  "agentId": "agent-1"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "cm5abc123xyz",
    "agentId": "agent-1",
    "agentName": "Maestro - Agent 01",
    // ... outros campos
  }
}
```

---

### DELETE /api/tasks/[id]/assign

**Remove o agente da tarefa**

Response:
```json
{
  "success": true,
  "data": {
    "id": "cm5abc123xyz",
    "agentId": null,
    "agentName": null,
    // ... outros campos
  }
}
```

## 🎨 Layout Responsivo

### Desktop (≥1024px)

```
┌─────────────────────────────────────────────────────┐
│ Header                                              │
├─────────────────────────────────────────────────────┤
│ ← Voltar                                            │
│ Título da Tarefa                                    │
│ [Badges]                                            │
│                                                     │
│ ┌──────────────────────┐  ┌─────────────────────┐  │
│ │ Informações          │  │ Agente             │  │
│ │                      │  │                    │  │
│ ├──────────────────────┤  ├─────────────────────┤  │
│ │ Ações                │  │ Metadados          │  │
│ │                      │  │                    │  │
│ ├──────────────────────┤  └─────────────────────┘  │
│ │ Histórico            │                          │
│ │                      │                          │
│ └──────────────────────┘                          │
└─────────────────────────────────────────────────────┘
```

### Mobile (<1024px)

```
┌──────────────────┐
│ Header           │
├──────────────────┤
│ ← Voltar         │
│ Título           │
│ [Badges]         │
│                  │
│ ┌──────────────┐ │
│ │ Informações  │ │
│ └──────────────┘ │
│                  │
│ ┌──────────────┐ │
│ │ Agente       │ │
│ └──────────────┘ │
│                  │
│ ┌──────────────┐ │
│ │ Ações        │ │
│ └──────────────┘ │
│                  │
│ ┌──────────────┐ │
│ │ Histórico    │ │
│ └──────────────┘ │
│                  │
│ ┌──────────────┐ │
│ │ Metadados    │ │
│ └──────────────┘ │
└──────────────────┘
```

## 🔄 Estados da Página

### 1. Loading

```tsx
<div className="flex items-center justify-center">
  <Loader2 className="animate-spin" />
  <p>Carregando tarefa...</p>
</div>
```

### 2. Error / 404

```tsx
<Card className="border-destructive">
  <AlertCircle />
  <h2>Tarefa não encontrada</h2>
  <p>Não foi possível carregar a tarefa.</p>
  <Button onClick={goBack}>Voltar</Button>
</Card>
```

### 3. Success (Task Loaded)

Renderiza a página completa com todos os cards.

## 🎯 Fluxo de Uso

### Visualizar Tarefa

1. Usuário acessa `/tasks/[id]`
2. Página faz GET `/api/tasks/[id]`
3. Dados são exibidos nos cards

### Mudar Status

1. Usuário clica em uma ação (ex: "Enviar para Revisão")
2. `handleStatusChange()` é chamado
3. PATCH `/api/tasks/[id]` com novo status
4. Tarefa é atualizada no estado local
5. UI reflete a mudança

### Atribuir Agente

1. Usuário abre dropdown do AgentSelector
2. Seleciona um agente
3. `handleAssignAgent()` é chamado
4. POST `/api/tasks/[id]/assign` com agentId
5. Tarefa é atualizada no estado local
6. UI reflete a mudança

### Remover Agente

1. Usuário abre dropdown do AgentSelector
2. Seleciona "Sem agente"
3. `handleRemoveAgent()` é chamado
4. DELETE `/api/tasks/[id]/assign`
5. Tarefa é atualizada no estado local
6. UI reflete a mudança

## 🔧 Componentes Utilizados

| Componente       | Arquivo                          | Uso                           |
|------------------|----------------------------------|-------------------------------|
| Header           | components/layout/Header.tsx     | Header da página              |
| Button           | components/ui/button.tsx         | Botões de ação                |
| Card             | components/ui/card.tsx           | Containers de conteúdo        |
| StatusBadge      | components/tasks/StatusBadge.tsx | Badge de status               |
| PriorityBadge    | components/tasks/PriorityBadge.tsx | Badge de prioridade         |
| AgentSelector    | components/tasks/AgentSelector.tsx | Seletor de agente           |
| TaskActions      | components/tasks/TaskActions.tsx | Botões de ação de status      |
| Timeline         | components/tasks/Timeline.tsx    | Histórico de mudanças         |

## 📅 Formatação de Datas

Usando `date-fns` com locale `ptBR`:

```typescript
// Data completa
format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
// "15 de fevereiro de 2026"

// Data e hora curta
format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
// "15/02/2026 às 14:32"
```

## 🧪 Testing

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import TaskDetailPage from './page';

// Mock fetch
global.fetch = jest.fn();

test('displays task details', async () => {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      success: true,
      data: {
        id: 'test-1',
        title: 'Test Task',
        status: 'TODO',
        priority: 'HIGH',
        // ... other fields
      },
    }),
  });

  render(<TaskDetailPage params={{ id: 'test-1' }} />);

  await waitFor(() => {
    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });
});

test('shows 404 for non-existent task', async () => {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: false,
    status: 404,
  });

  render(<TaskDetailPage params={{ id: 'non-existent' }} />);

  await waitFor(() => {
    expect(screen.getByText(/não encontrada/i)).toBeInTheDocument();
  });
});
```

## 🔒 Tratamento de Erros

### Tarefa não encontrada (404)

```tsx
if (response.status === 404) {
  setError('Tarefa não encontrada');
  return;
}
```

### Erro genérico

```tsx
if (!response.ok) {
  throw new Error('Erro ao buscar tarefa');
}
```

### Re-throw para componentes filhos

```tsx
// Em handleStatusChange, handleAssignAgent, etc.
catch (err) {
  console.error('Error:', err);
  throw err; // Re-throw para TaskActions/AgentSelector exibir erro
}
```

## 📚 Navegação

### Voltar para Dashboard

```tsx
<Button onClick={() => router.push('/')}>
  <ArrowLeft /> Voltar
</Button>
```

### Link direto

```
<Link href="/tasks/[id]">Ver detalhes</Link>
```

---

**Desenvolvido para Task Control Center** 🚀
