/**
 * AgentSelector Component - Usage Examples
 * Demonstrates how to use the AgentSelector component in different scenarios
 */

'use client';

import { useState } from 'react';
import {
  AgentSelector,
  AgentSelectorCompact,
  AgentBadge,
} from './AgentSelector';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// ============================================================================
// EXAMPLE 1: Basic AgentSelector Usage
// ============================================================================

export function AgentSelectorExample1() {
  const [currentAgentId, setCurrentAgentId] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);

  const handleAssign = async (taskId: string, agentId: string) => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setCurrentAgentId(agentId);
    setHistory([...history, `Task ${taskId}: Atribuído ao agente ${agentId}`]);
  };

  const handleRemove = async (taskId: string) => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setCurrentAgentId(null);
    setHistory([...history, `Task ${taskId}: Agente removido`]);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Atribuir Agente à Tarefa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              Agente Atual:
            </p>
            {currentAgentId ? (
              <Badge>Agente: {currentAgentId}</Badge>
            ) : (
              <Badge variant="outline">Sem agente</Badge>
            )}
          </div>

          <AgentSelector
            taskId="task-1"
            currentAgentId={currentAgentId}
            onAssign={handleAssign}
            onRemove={handleRemove}
          />

          {history.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Histórico:</p>
              <ul className="space-y-1">
                {history.map((item, index) => (
                  <li key={index} className="text-sm text-muted-foreground">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// EXAMPLE 2: Disabled State
// ============================================================================

export function AgentSelectorExample2() {
  const handleAssign = async (taskId: string, agentId: string) => {
    console.log(`Assign: ${taskId} → ${agentId}`);
  };

  const handleRemove = async (taskId: string) => {
    console.log(`Remove: ${taskId}`);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Estado Desabilitado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <p className="text-sm text-muted-foreground mb-3">
              Seletor habilitado:
            </p>
            <AgentSelector
              taskId="task-enabled"
              currentAgentId={null}
              onAssign={handleAssign}
              onRemove={handleRemove}
              disabled={false}
            />
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-3">
              Seletor desabilitado:
            </p>
            <AgentSelector
              taskId="task-disabled"
              currentAgentId={null}
              onAssign={handleAssign}
              onRemove={handleRemove}
              disabled={true}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// EXAMPLE 3: Compact Variant in Table
// ============================================================================

export function AgentSelectorExample3() {
  const [tasks, setTasks] = useState([
    { id: '1', title: 'Implementar login', agentId: null as string | null },
    { id: '2', title: 'Criar API', agentId: null as string | null },
    { id: '3', title: 'Testes unitários', agentId: null as string | null },
    { id: '4', title: 'Design UI', agentId: null as string | null },
  ]);

  const handleAssign = async (taskId: string, agentId: string) => {
    await new Promise((resolve) => setTimeout(resolve, 500));

    setTasks(
      tasks.map((task) =>
        task.id === taskId ? { ...task, agentId } : task
      )
    );
  };

  const handleRemove = async (taskId: string) => {
    await new Promise((resolve) => setTimeout(resolve, 500));

    setTasks(
      tasks.map((task) =>
        task.id === taskId ? { ...task, agentId: null } : task
      )
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Lista de Tarefas (Compact)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-4">Tarefa</th>
                  <th className="text-left py-2 px-4">Agente</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id} className="border-b">
                    <td className="py-3 px-4">{task.title}</td>
                    <td className="py-3 px-4">
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// EXAMPLE 4: AgentBadge (Display Only)
// ============================================================================

export function AgentSelectorExample4() {
  return (
    <div className="max-w-3xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>AgentBadge (Somente Leitura)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              Com agente atribuído:
            </p>
            <AgentBadge agentId="some-agent-id" />
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-2">
              Sem agente:
            </p>
            <AgentBadge agentId={null} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// EXAMPLE 5: Task Detail Page
// ============================================================================

export function AgentSelectorExample5() {
  const [task, setTask] = useState({
    id: 'task-123',
    title: 'Implementar autenticação OAuth',
    description: 'Adicionar suporte para login com Google e GitHub',
    status: 'IN_PROGRESS',
    agentId: null as string | null,
  });

  const handleAssign = async (taskId: string, agentId: string) => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setTask({ ...task, agentId });
  };

  const handleRemove = async (taskId: string) => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setTask({ ...task, agentId: null });
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{task.title}</CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                {task.description}
              </p>
            </div>
            <Badge variant="outline">{task.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground mb-2">ID</p>
              <p className="font-mono">{task.id}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-2">Status</p>
              <p>{task.status}</p>
            </div>
          </div>

          <div className="border-t pt-6">
            <p className="text-sm font-medium mb-3">Atribuir Agente</p>
            <AgentSelector
              taskId={task.id}
              currentAgentId={task.agentId}
              onAssign={handleAssign}
              onRemove={handleRemove}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// EXAMPLE 6: With API Integration
// ============================================================================

export function AgentSelectorExample6() {
  const [agentId, setAgentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAssign = async (taskId: string, agentId: string) => {
    try {
      setError(null);

      // API call to assign agent
      const response = await fetch(`/api/tasks/${taskId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId }),
      });

      if (!response.ok) {
        throw new Error('Failed to assign agent');
      }

      setAgentId(agentId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err; // Re-throw to let AgentSelector handle it
    }
  };

  const handleRemove = async (taskId: string) => {
    try {
      setError(null);

      // API call to remove agent
      const response = await fetch(`/api/tasks/${taskId}/assign`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to remove agent');
      }

      setAgentId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Com Integração de API</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <AgentSelector
            taskId="api-task-1"
            currentAgentId={agentId}
            onAssign={handleAssign}
            onRemove={handleRemove}
          />

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// EXAMPLE 7: All Variants Side by Side
// ============================================================================

export function AgentSelectorExample7() {
  const [agentId, setAgentId] = useState<string | null>(null);

  const handleAssign = async (taskId: string, agentId: string) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    setAgentId(agentId);
  };

  const handleRemove = async (taskId: string) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    setAgentId(null);
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Normal</CardTitle>
          </CardHeader>
          <CardContent>
            <AgentSelector
              taskId="task-normal"
              currentAgentId={agentId}
              onAssign={handleAssign}
              onRemove={handleRemove}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Compact</CardTitle>
          </CardHeader>
          <CardContent>
            <AgentSelectorCompact
              taskId="task-compact"
              currentAgentId={agentId}
              onAssign={handleAssign}
              onRemove={handleRemove}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Badge</CardTitle>
          </CardHeader>
          <CardContent>
            <AgentBadge agentId={agentId} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================================================
// ALL EXAMPLES PAGE
// ============================================================================

export default function AgentSelectorExamplesPage() {
  return (
    <div className="space-y-12 py-12">
      <div>
        <h1 className="text-3xl font-bold mb-2 text-center">
          AgentSelector Component Examples
        </h1>
        <p className="text-center text-muted-foreground">
          Exemplos de uso do componente AgentSelector
        </p>
      </div>

      <section>
        <h2 className="text-2xl font-semibold mb-4">
          Example 1: Uso Básico
        </h2>
        <AgentSelectorExample1 />
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">
          Example 2: Estado Desabilitado
        </h2>
        <AgentSelectorExample2 />
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">
          Example 3: Versão Compacta em Tabela
        </h2>
        <AgentSelectorExample3 />
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">
          Example 4: AgentBadge (Somente Leitura)
        </h2>
        <AgentSelectorExample4 />
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">
          Example 5: Página de Detalhes
        </h2>
        <AgentSelectorExample5 />
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">
          Example 7: Todas as Variantes
        </h2>
        <AgentSelectorExample7 />
      </section>
    </div>
  );
}
