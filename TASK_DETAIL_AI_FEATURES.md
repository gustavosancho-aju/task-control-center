# Task Detail Page - AI Features

Documentação das funcionalidades de IA adicionadas à página de detalhes da tarefa.

## 📦 Componentes Integrados

### 1. TaskAnalysisCard
- Análise completa da tarefa com IA
- Sugestão de agente mais adequado
- Estimativa de horas
- Avaliação de complexidade
- Tags sugeridas

### 2. SubtaskSuggestions
- Decomposição automática em subtarefas
- Criação individual ou em lote
- Vinculação automática via `parentId`

### 3. Lista de Subtarefas Existentes
- Busca via `GET /api/tasks?parentId=[id]`
- Cards clicáveis com link para detalhes
- Status e prioridade badges
- Contador visual no título

## 🎨 Layout e UX

### Indicadores Visuais

**Badge de Subtarefas no Título:**
```tsx
{existingSubtasks.length > 0 && (
  <Badge variant="outline">
    <ListTodo className="h-3.5 w-3.5" />
    {existingSubtasks.length} subtarefa{existingSubtasks.length > 1 ? 's' : ''}
  </Badge>
)}
```

**Badge de "Subtarefa" (se tarefa é filha):**
```tsx
{task.parentId && (
  <Badge variant="secondary">
    <ExternalLink className="h-3 w-3" />
    Subtarefa
  </Badge>
)}
```

### Seção "Análise IA"

**Header:**
- Ícone Sparkles (roxo)
- Título "Análise IA"
- Botão "Analisar Tarefa" no canto direito

**Estados:**
- **Empty:** Mensagem instruindo a clicar em "Analisar Tarefa"
- **Loading:** TaskAnalysisCard com skeleton
- **Success:** TaskAnalysisCard com análise completa

**Botão "Aplicar Agente Sugerido":**
- Aparece no TaskAnalysisCard
- Compara agente sugerido com agente atual
- Atualiza via `handleAssignAgent`
- Mostra feedback de sucesso/erro

### Seção "Subtarefas"

**Header:**
- Ícone ListTodo (azul)
- Título "Subtarefas"
- Badge com contador (se houver subtarefas)
- Botão "Sugerir com IA" no canto direito

**Subseções:**

1. **Sugestões da IA** (quando ativas):
   - SubtaskSuggestions component
   - Botões "Criar" individuais
   - Botão "Criar Todas" no footer

2. **Subtarefas Criadas** (quando existem):
   - Lista de cards clicáveis
   - Status, prioridade, horas estimadas
   - Hover effect com ícone ExternalLink
   - Link para página de detalhes

3. **Empty State** (sem subtarefas nem sugestões):
   - Mensagem instruindo a clicar em "Sugerir com IA"

## 🔧 Handlers Implementados

### handleAnalyzeTask (linha 198-220)
```typescript
const handleAnalyzeTask = async () => {
  // Chama POST /api/ai/analyze
  // Atualiza estado analysis
}
```

### handleApplySuggestion (linha 225-254)
```typescript
const handleApplySuggestion = async (field: string, value: any) => {
  if (field === 'agent') {
    // Aplica agente se diferente do atual
    await handleAssignAgent(task.id, agentId)
  }
  // Outros campos: estimatedHours, tags
}
```

### handleSuggestSubtasks (linha 259-283)
```typescript
const handleSuggestSubtasks = async () => {
  // Chama POST /api/ai/subtasks
  // Atualiza estado subtaskSuggestions
}
```

### handleCreateSubtask (linha 288-316)
```typescript
const handleCreateSubtask = async (subtask: SubtaskSuggestion) => {
  // Cria via POST /api/tasks com parentId
  // Remove da lista de sugestões
  // Adiciona à lista de subtarefas existentes
}
```

### handleCreateAllSubtasks (linha 321-354)
```typescript
const handleCreateAllSubtasks = async (subtasks: SubtaskSuggestion[]) => {
  // Promise.all para criar todas
  // Limpa sugestões
  // Adiciona todas à lista de existentes
}
```

## 📡 API Endpoints Utilizados

### Análise
- **POST** `/api/ai/analyze`
  - Body: `{ title, description }`
  - Response: `TaskAnalysis`

### Subtarefas
- **POST** `/api/ai/subtasks`
  - Body: `{ title, description, maxSubtasks: 5 }`
  - Response: `SubtaskSuggestion[]`

### Criar Subtarefa
- **POST** `/api/tasks`
  - Body: `{ title, description, priority, estimatedHours, status, parentId }`
  - Response: `Task`

### Buscar Subtarefas
- **GET** `/api/tasks?parentId=[id]`
  - Response: `Task[]`

## 🎯 Estados Gerenciados

```typescript
// AI Analysis
const [analysis, setAnalysis] = useState<TaskAnalysis | null>(null)
const [analyzingTask, setAnalyzingTask] = useState(false)

// Subtasks
const [subtaskSuggestions, setSubtaskSuggestions] = useState<SubtaskSuggestion[] | null>(null)
const [loadingSubtasks, setLoadingSubtasks] = useState(false)
const [existingSubtasks, setExistingSubtasks] = useState<Subtask[]>([])
const [loadingExistingSubtasks, setLoadingExistingSubtasks] = useState(false)
```

## 🔗 Tipos Adicionados

### Subtask Interface
```typescript
interface Subtask {
  id: string
  title: string
  description?: string | null
  status: TaskStatus
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  createdAt: string
  estimatedHours?: number | null
}
```

### Task Interface (atualizada)
```typescript
interface Task {
  // ... campos existentes
  parentId?: string | null  // NOVO: Link para tarefa pai
}
```

## 🚀 Fluxo de Uso

### Cenário 1: Analisar Tarefa

1. Usuário clica em "Analisar Tarefa"
2. Loading state ativado
3. API retorna análise
4. TaskAnalysisCard exibe resultado
5. Usuário pode clicar "Aplicar Sugestões"
6. Agente é atribuído automaticamente

### Cenário 2: Criar Subtarefas com IA

1. Usuário clica em "Sugerir com IA"
2. Loading state ativado
3. API retorna 5 sugestões
4. SubtaskSuggestions exibe lista
5. Usuário clica "Criar" em uma subtarefa
6. POST /api/tasks com `parentId`
7. Subtarefa adicionada à lista
8. Sugestão removida

### Cenário 3: Criar Todas Subtarefas

1. Usuário clica em "Criar Todas"
2. Promise.all cria todas em paralelo
3. Lista de sugestões é limpa
4. Todas adicionadas à lista de existentes
5. Contador atualizado no header

### Cenário 4: Navegar para Subtarefa

1. Usuário clica em card de subtarefa
2. Next.js navega para `/tasks/[subtaskId]`
3. Página carrega com badge "Subtarefa"
4. Usuário pode voltar para tarefa pai

## 🎨 Layout Visual

```
┌─────────────────────────────────────────────────┐
│ ← Voltar                                        │
│                                                 │
│ Título da Tarefa          [📋 2 subtarefas]    │
│ [Status] [Prioridade]                           │
└─────────────────────────────────────────────────┘

┌──────────────────────┬──────────────────────────┐
│                      │                          │
│ ✨ Análise IA        │ Agente Responsável       │
│    [Analisar Tarefa] │ [Select Agente]          │
│                      │                          │
│ [TaskAnalysisCard]   │ Metadados                │
│                      │ - ID: xxx-xxx            │
│ ────────────────     │ - Atualizado: dd/mm      │
│                      │                          │
│ 📋 Subtarefas    [2] │                          │
│    [Sugerir com IA]  │                          │
│                      │                          │
│ Sugestões da IA      │                          │
│ [SubtaskSuggestions] │                          │
│                      │                          │
│ ─────────────────    │                          │
│                      │                          │
│ Subtarefas Criadas   │                          │
│ (2)                  │                          │
│                      │                          │
│ ┌──────────────────┐ │                          │
│ │ Setup OAuth    → │ │                          │
│ │ [TODO] [ALTA]    │ │                          │
│ └──────────────────┘ │                          │
│                      │                          │
│ ┌──────────────────┐ │                          │
│ │ Implement Auth → │ │                          │
│ │ [TODO] [ALTA]    │ │                          │
│ └──────────────────┘ │                          │
│                      │                          │
│ ────────────────     │                          │
│                      │                          │
│ Histórico            │                          │
│ [Timeline]           │                          │
│                      │                          │
└──────────────────────┴──────────────────────────┘
```

## 🔧 Próximos Passos / Melhorias

### 1. Campos Adicionais
- Adicionar campo de tags editável
- Adicionar campo de horas estimadas editável
- Permitir editar subtarefas inline

### 2. Mapeamento de Agentes
Atualizar o `agentMap` com IDs reais do banco:
```typescript
const agentMap: Record<string, string> = {
  MAESTRO: 'real-id-from-db',
  SENTINEL: 'real-id-from-db',
  ARCHITECTON: 'real-id-from-db',
  PIXEL: 'real-id-from-db',
}
```

### 3. Feedback Visual
- Substituir `alert()` por toast notifications
- Adicionar loading skeleton para subtarefas existentes
- Animações de entrada/saída

### 4. Funcionalidades Extras
- Permitir reordenar subtarefas (drag & drop)
- Marcar subtarefa como concluída sem sair da página pai
- Botão "Re-analisar" após editar título/descrição
- Cache de análises anteriores

### 5. Navegação
- Breadcrumb para subtarefas (Tarefa Pai > Subtarefa)
- Link "Ver Tarefa Pai" quando task.parentId existe
- Sidebar com árvore de subtarefas

## 📚 Arquivos Relacionados

- `app/tasks/[id]/page.tsx` - Página atualizada
- `components/ai/TaskAnalysisCard.tsx` - Análise IA
- `components/ai/SubtaskSuggestions.tsx` - Sugestões de subtarefas
- `types/ai.ts` - Tipos TypeScript
- `app/api/ai/analyze/route.ts` - Endpoint de análise
- `app/api/ai/subtasks/route.ts` - Endpoint de subtarefas
- `app/api/tasks/route.ts` - CRUD de tarefas (com parentId)

---

**Desenvolvido para Task Control Center** 🚀
