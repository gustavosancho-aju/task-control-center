# TaskAssistant Component

Componente para melhorar tarefas usando IA, com interface de revisão antes de aplicar as sugestões.

## 📦 Props

```typescript
interface TaskAssistantProps {
  title: string;                              // Título atual da tarefa
  description: string;                        // Descrição atual da tarefa
  onImprove: (improved: TaskImprovement) => void;  // Callback ao aplicar melhorias
}
```

### TaskImprovement Type

```typescript
interface TaskImprovement {
  improvedTitle: string;
  improvedDescription: string;
  suggestions: string[];
}
```

## 🎨 Features

### 1. **Botão de Melhoria**

- ✨ **Texto**: "Melhorar com IA" com ícone Sparkles
- ⏳ **Loading State**: Mostra "Melhorando..." com spinner animado
- 🚫 **Validação**: Requer título com mínimo 3 caracteres
- 🎨 **Estilo**: Outline variant do Button

### 2. **Dialog de Revisão**

- 📋 **Título Melhorado**: Exibido em card destacado
- 📄 **Descrição Melhorada**: Preserva quebras de linha com `whitespace-pre-wrap`
- 💡 **Sugestões Adicionais**: Lista numerada com badges roxos
- ✅ **Botões de Ação**: "Cancelar" e "Aplicar Melhorias"

### 3. **Estados Visuais**

- **Idle**: Botão pronto para uso
- **Loading**: Spinner e texto "Melhorando..." durante chamada API
- **Success**: Dialog aberto com sugestões
- **Error**: Alert com mensagem de erro

### 4. **Integração com API**

- Chama `POST /api/ai/improve`
- Envia `{ title, description }`
- Trata erros com feedback amigável
- Valida resposta antes de exibir

## 🚀 Uso Básico

```tsx
import { TaskAssistant } from '@/components/ai/TaskAssistant';
import { useState } from 'react';

function TaskForm() {
  const [title, setTitle] = useState('Fix bug');
  const [description, setDescription] = useState('The app crashes sometimes');

  const handleImprove = (improved: TaskImprovement) => {
    // Aplicar melhorias aos campos do formulário
    setTitle(improved.improvedTitle);
    setDescription(improved.improvedDescription);

    // Opcional: mostrar toast de sucesso
    toast({
      title: 'Tarefa melhorada!',
      description: 'As sugestões da IA foram aplicadas.',
    });
  };

  return (
    <div className="space-y-4">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título da tarefa"
      />

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Descrição"
      />

      <TaskAssistant
        title={title}
        description={description}
        onImprove={handleImprove}
      />
    </div>
  );
}
```

## 📋 Fluxo de Uso

### 1. Usuário Clica em "Melhorar com IA"

```
[Botão] → [Loading] → [Chamada API]
```

### 2. IA Processa a Tarefa

```
POST /api/ai/improve
{
  "title": "Fix bug",
  "description": "The app crashes sometimes"
}
```

### 3. Dialog Exibe Sugestões

```
┌─────────────────────────────────────────┐
│ ✨ Sugestões de Melhoria                │
│ A IA analisou sua tarefa...             │
├─────────────────────────────────────────┤
│                                         │
│ ✓ Título Melhorado                      │
│ ┌───────────────────────────────────┐   │
│ │ Corrigir bug de crash na aplicação│   │
│ └───────────────────────────────────┘   │
│                                         │
│ ✓ Descrição Melhorada                   │
│ ┌───────────────────────────────────┐   │
│ │ Investigar e corrigir o problema  │   │
│ │ de crash intermitente que ocorre  │   │
│ │ em condições específicas...       │   │
│ └───────────────────────────────────┘   │
│                                         │
│ Sugestões Adicionais                    │
│ ① Adicionar logs para rastrear...      │
│ ② Criar testes de reprodução...       │
│ ③ Documentar condições do bug...      │
│                                         │
├─────────────────────────────────────────┤
│         [Cancelar] [✨ Aplicar]         │
└─────────────────────────────────────────┘
```

### 4. Usuário Escolhe uma Ação

**Opção A - Aplicar:**
- Fecha dialog
- Chama `onImprove(improvement)`
- Parent component atualiza campos

**Opção B - Cancelar:**
- Fecha dialog
- Descarta sugestões
- Nenhum callback é chamado

## 🔌 Integração com API

### Endpoint: POST /api/ai/improve

```typescript
// Request
{
  "title": "Fix bug",
  "description": "The app crashes sometimes"
}

// Response (Success)
{
  "success": true,
  "data": {
    "improvedTitle": "Corrigir bug de crash na aplicação",
    "improvedDescription": "Investigar e corrigir o problema de crash...",
    "suggestions": [
      "Adicionar logs para rastrear o problema",
      "Criar testes de reprodução do bug",
      "Documentar condições que causam o crash"
    ]
  }
}

// Response (Error)
{
  "success": false,
  "error": "Título deve ter pelo menos 3 caracteres",
  "details": [...]
}
```

## 🎯 Callback onImprove

Recebe o objeto `TaskImprovement` quando usuário clica "Aplicar":

```typescript
const handleImprove = (improved: TaskImprovement) => {
  // 1. Atualizar campos do formulário
  setTitle(improved.improvedTitle);
  setDescription(improved.improvedDescription);

  // 2. (Opcional) Salvar histórico de versões
  setHistory((prev) => [...prev, {
    timestamp: Date.now(),
    original: { title, description },
    improved: improved,
  }]);

  // 3. (Opcional) Mostrar feedback visual
  toast.success('Tarefa melhorada com sucesso!');

  // 4. (Opcional) Marcar campo como "editado por IA"
  setAiEdited(true);
};
```

## 💡 Padrões de Uso

### 1. Integração com Formulário React Hook Form

```tsx
import { useForm } from 'react-hook-form';

function TaskFormWithRHF() {
  const { setValue, watch } = useForm();
  const title = watch('title');
  const description = watch('description');

  const handleImprove = (improved: TaskImprovement) => {
    setValue('title', improved.improvedTitle);
    setValue('description', improved.improvedDescription);
  };

  return (
    <TaskAssistant
      title={title}
      description={description}
      onImprove={handleImprove}
    />
  );
}
```

### 2. Preview Antes de Aplicar

```tsx
const [preview, setPreview] = useState<TaskImprovement | null>(null);

const handleImprove = (improved: TaskImprovement) => {
  // Mostrar preview em outro componente
  setPreview(improved);

  // Permitir usuário comparar antes de confirmar
  // Aplicar só quando clicar em "Confirmar Preview"
};
```

### 3. Histórico de Melhorias

```tsx
const [improvements, setImprovements] = useState<TaskImprovement[]>([]);

const handleImprove = (improved: TaskImprovement) => {
  setTitle(improved.improvedTitle);
  setDescription(improved.improvedDescription);

  // Salvar no histórico
  setImprovements((prev) => [...prev, improved]);
};

// Permitir "desfazer" voltando a versão anterior
const handleUndo = () => {
  const previous = improvements[improvements.length - 2];
  if (previous) {
    setTitle(previous.improvedTitle);
    setDescription(previous.improvedDescription);
  }
};
```

### 4. Modo "Sugestão Apenas"

```tsx
const handleImprove = (improved: TaskImprovement) => {
  // Não aplicar automaticamente, mostrar lado a lado
  setSuggestions(improved);
  setCompareMode(true);
};

// Interface mostra:
// Original | Sugerido
// ---------|----------
// [atual]  | [improved]
```

## 🎨 Customização

### Alterar Texto do Botão

```tsx
// Modificar em TaskAssistant.tsx linha ~95
<>
  <Sparkles className="h-4 w-4" />
  Otimizar Tarefa  {/* ao invés de "Melhorar com IA" */}
</>
```

### Alterar Largura do Dialog

```tsx
// Modificar em TaskAssistant.tsx linha ~99
<DialogContent className="max-w-3xl ...">  {/* ao invés de max-w-2xl */}
```

### Adicionar Confirmação Extra

```tsx
const handleApply = () => {
  if (confirm('Deseja realmente aplicar as melhorias?')) {
    if (improvement) {
      onImprove(improvement);
      setDialogOpen(false);
    }
  }
};
```

## 🧩 Composição

O componente usa:
- `Button` - shadcn/ui
- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter` - shadcn/ui
- Ícones do `lucide-react`:
  - `Sparkles` - IA/Melhorias
  - `Loader2` - Loading/Carregando
  - `CheckCircle2` - Sucesso/Validado

## 🚨 Validação e Erros

### Validação no Cliente

```typescript
if (!title || title.trim().length < 3) {
  alert('O título deve ter pelo menos 3 caracteres');
  return;
}
```

### Tratamento de Erro da API

```typescript
try {
  // ... chamada API
} catch (error) {
  console.error('Error improving task:', error);
  alert(
    error instanceof Error
      ? `Erro: ${error.message}`
      : 'Erro ao melhorar tarefa. Tente novamente.'
  );
}
```

### Estados de Erro Possíveis

| Erro | Causa | Mensagem |
|------|-------|----------|
| 400 | Título muito curto | "O título deve ter pelo menos 3 caracteres" |
| 500 | Falha da IA | "Erro ao melhorar tarefa. Tente novamente." |
| Network | Sem conexão | "Erro de rede. Verifique sua conexão." |

## 📝 Observações

- O componente é **client-side only** (`'use client'`)
- Validação mínima de 3 caracteres no título
- Loading state desabilita botão para evitar múltiplas chamadas
- Dialog fecha automaticamente ao aplicar ou cancelar
- Descrição preserva formatação com `whitespace-pre-wrap`
- Sugestões são opcionais (array pode ser vazio)
- Componente é controlado (não gerencia state de title/description)

## 📚 Arquivos Relacionados

- `components/ai/TaskAssistant.tsx` - Componente principal
- `components/ai/TaskAssistant.example.tsx` - Exemplos de uso
- `types/ai.ts` - Tipos TypeScript
- `app/api/ai/improve/route.ts` - Endpoint da API
- `lib/ai/task-analyzer.ts` - Lógica de melhoria com Claude

---

**Desenvolvido para Task Control Center** 🚀
