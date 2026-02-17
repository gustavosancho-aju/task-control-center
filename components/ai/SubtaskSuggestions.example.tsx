'use client';

import { useState } from 'react';
import { SubtaskSuggestions } from './SubtaskSuggestions';
import { Button } from '@/components/ui/button';
import type { SubtaskSuggestion } from '@/types/ai';

/**
 * Example usage of SubtaskSuggestions component
 */
export function SubtaskSuggestionsExample() {
  const [suggestions, setSuggestions] = useState<SubtaskSuggestion[] | null>(null);
  const [loading, setLoading] = useState(false);

  // Simulate suggestions request
  const handleSuggest = async () => {
    setLoading(true);
    setSuggestions(null);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2500));

    // Mock suggestions result
    setSuggestions([
      {
        title: 'Configurar OAuth providers',
        description: 'Configurar Google e GitHub OAuth no projeto, incluindo credenciais e redirecionamento',
        priority: 'HIGH',
        estimatedHours: 4,
      },
      {
        title: 'Implementar callback handlers',
        description: 'Criar endpoints de callback para processar respostas de autenticação dos providers',
        priority: 'HIGH',
        estimatedHours: 3,
      },
      {
        title: 'Criar telas de login',
        description: 'Desenvolver interface de usuário para seleção de provider e login',
        priority: 'MEDIUM',
        estimatedHours: 2,
      },
      {
        title: 'Adicionar testes de integração',
        description: 'Implementar testes E2E para fluxo completo de autenticação OAuth',
        priority: 'MEDIUM',
        estimatedHours: 3,
      },
      {
        title: 'Documentar fluxo OAuth',
        description: 'Criar documentação técnica do processo de autenticação para desenvolvedores',
        priority: 'LOW',
        estimatedHours: 1,
      },
    ]);

    setLoading(false);
  };

  // Handle creating individual subtask
  const handleCreateSubtask = async (subtask: SubtaskSuggestion) => {
    console.log('Creating subtask:', subtask);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Remove from list after creation
    setSuggestions((prev) => prev?.filter((s) => s !== subtask) ?? null);

    alert(`Subtarefa criada com sucesso!\n\nTítulo: ${subtask.title}`);
  };

  // Handle creating all subtasks
  const handleCreateAll = async (subtasks: SubtaskSuggestion[]) => {
    console.log('Creating all subtasks:', subtasks);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Clear list after creation
    setSuggestions([]);

    alert(`${subtasks.length} subtarefas criadas com sucesso!`);
  };

  return (
    <div className="max-w-2xl space-y-4">
      <h2 className="text-2xl font-bold">SubtaskSuggestions - Exemplo de Uso</h2>

      <div className="space-y-4">
        <Button onClick={handleSuggest} disabled={loading}>
          {loading ? 'Sugerindo...' : 'Sugerir Subtarefas'}
        </Button>

        <SubtaskSuggestions
          suggestions={suggestions}
          loading={loading}
          onCreateSubtask={handleCreateSubtask}
          onCreateAll={handleCreateAll}
        />
      </div>

      <div className="mt-8 space-y-4">
        <h3 className="text-lg font-semibold">Estados do Componente</h3>

        <div className="space-y-2">
          <h4 className="font-medium">1. Estado Vazio (Inicial)</h4>
          <SubtaskSuggestions
            suggestions={null}
            loading={false}
            onCreateSubtask={handleCreateSubtask}
            onCreateAll={handleCreateAll}
          />
        </div>

        <div className="space-y-2">
          <h4 className="font-medium">2. Estado de Loading</h4>
          <SubtaskSuggestions
            suggestions={null}
            loading={true}
            onCreateSubtask={handleCreateSubtask}
            onCreateAll={handleCreateAll}
          />
        </div>

        <div className="space-y-2">
          <h4 className="font-medium">3. Lista Vazia (Sem Sugestões)</h4>
          <SubtaskSuggestions
            suggestions={[]}
            loading={false}
            onCreateSubtask={handleCreateSubtask}
            onCreateAll={handleCreateAll}
          />
        </div>

        <div className="space-y-2">
          <h4 className="font-medium">4. Prioridade BAIXA</h4>
          <SubtaskSuggestions
            suggestions={[
              {
                title: 'Atualizar README',
                description: 'Adicionar documentação básica do projeto',
                priority: 'LOW',
                estimatedHours: 0.5,
              },
            ]}
            loading={false}
            onCreateSubtask={handleCreateSubtask}
            onCreateAll={handleCreateAll}
          />
        </div>

        <div className="space-y-2">
          <h4 className="font-medium">5. Prioridade MÉDIA</h4>
          <SubtaskSuggestions
            suggestions={[
              {
                title: 'Adicionar validação de formulário',
                description: 'Implementar validação com Zod nos campos do formulário',
                priority: 'MEDIUM',
                estimatedHours: 2,
              },
            ]}
            loading={false}
            onCreateSubtask={handleCreateSubtask}
            onCreateAll={handleCreateAll}
          />
        </div>

        <div className="space-y-2">
          <h4 className="font-medium">6. Prioridade ALTA</h4>
          <SubtaskSuggestions
            suggestions={[
              {
                title: 'Implementar autenticação',
                description: 'Adicionar sistema de login e proteção de rotas',
                priority: 'HIGH',
                estimatedHours: 8,
              },
            ]}
            loading={false}
            onCreateSubtask={handleCreateSubtask}
            onCreateAll={handleCreateAll}
          />
        </div>

        <div className="space-y-2">
          <h4 className="font-medium">7. Prioridade URGENTE</h4>
          <SubtaskSuggestions
            suggestions={[
              {
                title: 'Corrigir vulnerabilidade crítica',
                description: 'Aplicar patch de segurança para correção de SQL injection',
                priority: 'URGENT',
                estimatedHours: 4,
              },
            ]}
            loading={false}
            onCreateSubtask={handleCreateSubtask}
            onCreateAll={handleCreateAll}
          />
        </div>

        <div className="space-y-2">
          <h4 className="font-medium">8. Múltiplas Subtarefas (Máximo 5)</h4>
          <SubtaskSuggestions
            suggestions={[
              {
                title: 'Setup inicial do banco',
                description: 'Configurar PostgreSQL e criar schema inicial',
                priority: 'HIGH',
                estimatedHours: 2,
              },
              {
                title: 'Criar modelos Prisma',
                description: 'Definir schema Prisma para todas as entidades',
                priority: 'HIGH',
                estimatedHours: 3,
              },
              {
                title: 'Implementar migrations',
                description: 'Criar migrations para versionamento do banco',
                priority: 'MEDIUM',
                estimatedHours: 1,
              },
              {
                title: 'Seed do banco',
                description: 'Adicionar dados iniciais para desenvolvimento',
                priority: 'LOW',
                estimatedHours: 1,
              },
              {
                title: 'Configurar RLS policies',
                description: 'Implementar Row Level Security para segurança dos dados',
                priority: 'HIGH',
                estimatedHours: 4,
              },
            ]}
            loading={false}
            onCreateSubtask={handleCreateSubtask}
            onCreateAll={handleCreateAll}
          />
        </div>
      </div>
    </div>
  );
}
