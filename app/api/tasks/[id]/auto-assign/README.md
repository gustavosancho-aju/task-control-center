# Auto-Assign Agent Endpoint

Endpoint para atribuição automática de agente via IA.

## 📍 Endpoint

```
POST /api/tasks/[id]/auto-assign
```

## 🎯 Funcionalidade

Analisa automaticamente a tarefa com IA e atribui o agente mais adequado baseado na análise.

### Fluxo de Execução

1. **Busca a tarefa** pelo ID
2. **Verifica se já tem agente** atribuído (retorna erro 400 se sim)
3. **Analisa a tarefa** com `analyzeTask()` da IA
4. **Mapeia o agente sugerido** para o nome no banco de dados
5. **Busca o agente** na tabela `Agent`
6. **Atribui o agente** à tarefa
7. **Cria entrada no histórico** com detalhes da análise
8. **Retorna** tarefa atualizada + análise + agente

## 📋 Request

### Headers
```
Content-Type: application/json
```

### Body
Nenhum body é necessário. O endpoint usa apenas o ID da rota.

### Exemplo
```bash
curl -X POST http://localhost:3000/api/tasks/cm123abc/auto-assign
```

## 📤 Response

### Success (200)

```json
{
  "success": true,
  "data": {
    "task": {
      "id": "cm123abc",
      "title": "Implementar autenticação OAuth",
      "description": "Adicionar login com Google e GitHub",
      "status": "TODO",
      "priority": "HIGH",
      "agentId": "agent-architecton-id",
      "agentName": "Architecton",
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:05:00.000Z",
      "agent": {
        "id": "agent-architecton-id",
        "name": "Architecton",
        "description": "Arquiteto - especialista em arquitetura e integrações",
        "emoji": "🏗️",
        "color": "#10b981"
      },
      "statusHistory": [
        {
          "id": "history-1",
          "taskId": "cm123abc",
          "fromStatus": "TODO",
          "toStatus": "TODO",
          "notes": "Agente Architecton atribuído automaticamente via IA (HIGH complexity, 12h estimated)",
          "changedAt": "2024-01-15T10:05:00.000Z"
        }
      ]
    },
    "analysis": {
      "suggestedAgent": "ARCHITECTON",
      "estimatedHours": 12,
      "complexity": "HIGH",
      "tags": ["oauth", "authentication", "security", "integration"],
      "reasoning": "Esta tarefa envolve decisões arquiteturais críticas sobre autenticação..."
    },
    "assignedAgent": {
      "id": "agent-architecton-id",
      "name": "Architecton",
      "description": "Arquiteto - especialista em arquitetura e integrações",
      "emoji": "🏗️",
      "color": "#10b981"
    }
  }
}
```

### Error: Task Not Found (404)

```json
{
  "success": false,
  "error": "Tarefa não encontrada"
}
```

### Error: Already Has Agent (400)

```json
{
  "success": false,
  "error": "Tarefa já possui agente atribuído",
  "data": {
    "currentAgent": {
      "id": "agent-maestro-id",
      "name": "Maestro",
      "description": "Orquestrador - especialista em coordenação",
      "emoji": "🎯",
      "color": "#3b82f6"
    }
  }
}
```

### Error: AI Analysis Failed (500)

```json
{
  "success": false,
  "error": "Erro ao analisar tarefa com IA"
}
```

### Error: Unknown Agent (400)

```json
{
  "success": false,
  "error": "Agente sugerido desconhecido: UNKNOWN_AGENT"
}
```

### Error: Agent Not Found in DB (404)

```json
{
  "success": false,
  "error": "Agente \"Architecton\" não encontrado no banco de dados",
  "suggestion": "Certifique-se de que o agente existe na tabela Agent"
}
```

### Error: Internal Server Error (500)

```json
{
  "success": false,
  "error": "Erro interno do servidor",
  "details": "Connection to database failed"
}
```

## 🎯 Mapeamento de Agentes

O endpoint mapeia os nomes da IA para os nomes no banco de dados:

```typescript
const agentNameMap: Record<string, string> = {
  MAESTRO: 'Maestro',      // IA → Banco de Dados
  SENTINEL: 'Sentinel',
  ARCHITECTON: 'Architecton',
  PIXEL: 'Pixel',
}
```

**IMPORTANTE:** Ajuste este mapeamento conforme os nomes reais na sua tabela `Agent`.

## 📊 Entrada no Histórico

Quando o agente é atribuído, uma entrada é criada no histórico com o seguinte formato:

```
Agente {agentName} atribuído automaticamente via IA ({complexity} complexity, {estimatedHours}h estimated)
```

Exemplo:
```
Agente Architecton atribuído automaticamente via IA (HIGH complexity, 12h estimated)
```

## 🔧 Configuração Necessária

### 1. Tabela Agent

Certifique-se de que a tabela `Agent` existe com a seguinte estrutura:

```prisma
model Agent {
  id          String   @id @default(cuid())
  name        String   @unique
  description String?
  emoji       String?
  color       String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  tasks       Task[]
}
```

### 2. Dados Iniciais

Insira os agentes no banco de dados:

```sql
INSERT INTO Agent (id, name, description, emoji, color) VALUES
  ('agent-maestro-id', 'Maestro', 'Orquestrador - especialista em coordenação', '🎯', '#3b82f6'),
  ('agent-sentinel-id', 'Sentinel', 'Guardião - especialista em qualidade e testes', '🛡️', '#8b5cf6'),
  ('agent-architecton-id', 'Architecton', 'Arquiteto - especialista em arquitetura e integrações', '🏗️', '#10b981'),
  ('agent-pixel-id', 'Pixel', 'Designer - especialista em UI/UX', '🎨', '#f59e0b');
```

Ou via Prisma:

```typescript
await prisma.agent.createMany({
  data: [
    { name: 'Maestro', description: 'Orquestrador - especialista em coordenação', emoji: '🎯', color: '#3b82f6' },
    { name: 'Sentinel', description: 'Guardião - especialista em qualidade e testes', emoji: '🛡️', color: '#8b5cf6' },
    { name: 'Architecton', description: 'Arquiteto - especialista em arquitetura e integrações', emoji: '🏗️', color: '#10b981' },
    { name: 'Pixel', description: 'Designer - especialista em UI/UX', emoji: '🎨', color: '#f59e0b' },
  ],
});
```

### 3. API Key da Anthropic

Certifique-se de que a variável de ambiente `ANTHROPIC_API_KEY` está configurada no `.env`:

```env
ANTHROPIC_API_KEY=sk-ant-api03-...
```

## 💡 Casos de Uso

### 1. Atribuição Automática em Lote

```typescript
async function autoAssignAllUnassignedTasks() {
  const unassignedTasks = await prisma.task.findMany({
    where: { agentId: null },
  });

  for (const task of unassignedTasks) {
    try {
      const response = await fetch(`/api/tasks/${task.id}/auto-assign`, {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        console.log(`✅ ${task.title} → ${result.data.assignedAgent.name}`);
      } else {
        console.log(`❌ ${task.title}: ${result.error}`);
      }
    } catch (error) {
      console.error(`Error assigning ${task.title}:`, error);
    }
  }
}
```

### 2. Botão "Auto-Atribuir" na UI

```tsx
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

function AutoAssignButton({ taskId }: { taskId: string }) {
  const [loading, setLoading] = useState(false);

  const handleAutoAssign = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/auto-assign`, {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        toast.success(
          `Agente ${result.data.assignedAgent.name} atribuído automaticamente!`
        );
        // Refresh task data
        window.location.reload();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('Erro ao atribuir agente automaticamente');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleAutoAssign} disabled={loading} variant="outline">
      <Sparkles className="h-4 w-4 mr-2" />
      {loading ? 'Atribuindo...' : 'Auto-Atribuir Agente'}
    </Button>
  );
}
```

### 3. Webhook após Criar Tarefa

```typescript
// app/api/tasks/route.ts
export async function POST(request: NextRequest) {
  // ... criar tarefa

  const newTask = await prisma.task.create({
    data: { ... },
  });

  // Auto-assign agent via IA
  try {
    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/tasks/${newTask.id}/auto-assign`, {
      method: 'POST',
    });
  } catch (error) {
    console.error('Failed to auto-assign agent:', error);
    // Não falha a criação da tarefa
  }

  return NextResponse.json({
    success: true,
    data: newTask,
  });
}
```

### 4. Re-atribuir com Análise Atualizada

```typescript
async function reassignWithFreshAnalysis(taskId: string) {
  // 1. Remove agente atual
  await fetch(`/api/tasks/${taskId}/assign`, {
    method: 'DELETE',
  });

  // 2. Auto-atribui com análise nova
  const response = await fetch(`/api/tasks/${taskId}/auto-assign`, {
    method: 'POST',
  });

  return await response.json();
}
```

## 🧪 Testes

### Teste Manual via cURL

```bash
# 1. Criar tarefa sem agente
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Implementar autenticação OAuth",
    "description": "Adicionar login com Google e GitHub",
    "priority": "HIGH",
    "status": "TODO"
  }'

# Response: { "success": true, "data": { "id": "cm123abc", ... } }

# 2. Auto-atribuir agente
curl -X POST http://localhost:3000/api/tasks/cm123abc/auto-assign

# 3. Verificar atribuição
curl http://localhost:3000/api/tasks/cm123abc

# 4. Tentar auto-atribuir novamente (deve falhar com 400)
curl -X POST http://localhost:3000/api/tasks/cm123abc/auto-assign
```

### Teste Unitário

```typescript
import { POST } from './route';
import { NextRequest } from 'next/server';

describe('POST /api/tasks/[id]/auto-assign', () => {
  it('should assign agent automatically', async () => {
    const request = new NextRequest('http://localhost:3000/api/tasks/cm123abc/auto-assign', {
      method: 'POST',
    });

    const response = await POST(request, { params: { id: 'cm123abc' } });
    const result = await response.json();

    expect(result.success).toBe(true);
    expect(result.data.assignedAgent).toBeDefined();
    expect(result.data.analysis).toBeDefined();
  });

  it('should return 400 if task already has agent', async () => {
    // ... test implementation
  });
});
```

## 📚 Arquivos Relacionados

- `app/api/tasks/[id]/auto-assign/route.ts` - Endpoint principal
- `lib/ai/task-analyzer.ts` - Função `analyzeTask()`
- `types/ai.ts` - Interface `TaskAnalysis`
- `prisma/schema.prisma` - Models Task e Agent

## 🔄 Fluxograma

```
┌─────────────────────┐
│ POST /auto-assign   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Fetch Task by ID    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Has Agent?          │
└──────────┬──────────┘
           │
      YES  │  NO
           ▼
┌─────────────────────┐
│ Return 400 Error    │
└─────────────────────┘

           │
           ▼
┌─────────────────────┐
│ Analyze with AI     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Map Agent Name      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Find Agent in DB    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Assign Agent        │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Create History      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Return Success      │
└─────────────────────┘
```

---

**Desenvolvido para Task Control Center** 🚀
