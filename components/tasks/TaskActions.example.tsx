/**
 * TaskActions Component - Usage Examples
 * Demonstrates how to use the TaskActions component in different scenarios
 */

'use client';

import { useState } from 'react';
import {
  TaskActions,
  TaskActionsCompact,
  TaskActionsDropdown,
} from './TaskActions';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { TaskStatus } from '@/lib/workflow/state-machine';

// ============================================================================
// EXAMPLE 1: Basic TaskActions Usage
// ============================================================================

export function TaskActionsExample1() {
  const [status, setStatus] = useState<TaskStatus>('TODO');
  const [history, setHistory] = useState<string[]>([]);

  const handleAction = async (taskId: string, newStatus: string) => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setStatus(newStatus as TaskStatus);
    setHistory([
      ...history,
      `Task ${taskId}: ${status} → ${newStatus}`,
    ]);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Ações da Tarefa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              Status Atual:
            </p>
            <Badge>{status}</Badge>
          </div>

          <TaskActions
            taskId="task-1"
            currentStatus={status}
            onAction={handleAction}
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
// EXAMPLE 2: All Status States
// ============================================================================

export function TaskActionsExample2() {
  const statuses: TaskStatus[] = [
    'TODO',
    'IN_PROGRESS',
    'REVIEW',
    'DONE',
    'BLOCKED',
  ];

  const handleAction = async (taskId: string, newStatus: string) => {
    console.log(`Action: ${taskId} → ${newStatus}`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {statuses.map((status) => (
          <Card key={status}>
            <CardHeader>
              <CardTitle className="text-lg">{status}</CardTitle>
            </CardHeader>
            <CardContent>
              <TaskActions
                taskId={`task-${status}`}
                currentStatus={status}
                onAction={handleAction}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// EXAMPLE 3: Disabled State
// ============================================================================

export function TaskActionsExample3() {
  const handleAction = async (taskId: string, newStatus: string) => {
    console.log(`Action: ${taskId} → ${newStatus}`);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Ações Desabilitadas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <p className="text-sm text-muted-foreground mb-3">
              Ações habilitadas:
            </p>
            <TaskActions
              taskId="task-enabled"
              currentStatus="IN_PROGRESS"
              onAction={handleAction}
              disabled={false}
            />
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-3">
              Ações desabilitadas:
            </p>
            <TaskActions
              taskId="task-disabled"
              currentStatus="IN_PROGRESS"
              onAction={handleAction}
              disabled={true}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// EXAMPLE 4: Compact Variant (for Tables)
// ============================================================================

export function TaskActionsExample4() {
  const tasks = [
    { id: '1', title: 'Implementar login', status: 'TODO' as TaskStatus },
    { id: '2', title: 'Criar API', status: 'IN_PROGRESS' as TaskStatus },
    { id: '3', title: 'Testes unitários', status: 'REVIEW' as TaskStatus },
    { id: '4', title: 'Deploy produção', status: 'DONE' as TaskStatus },
    { id: '5', title: 'Bug crítico', status: 'BLOCKED' as TaskStatus },
  ];

  const handleAction = async (taskId: string, newStatus: string) => {
    console.log(`Action: ${taskId} → ${newStatus}`);
    await new Promise((resolve) => setTimeout(resolve, 500));
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
                  <th className="text-left py-2 px-4">Status</th>
                  <th className="text-left py-2 px-4">Ações</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id} className="border-b">
                    <td className="py-3 px-4">{task.title}</td>
                    <td className="py-3 px-4">
                      <Badge variant="outline">{task.status}</Badge>
                    </td>
                    <td className="py-3 px-4">
                      <TaskActionsCompact
                        taskId={task.id}
                        currentStatus={task.status}
                        onAction={handleAction}
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
// EXAMPLE 5: Dropdown Variant (for Compact Spaces)
// ============================================================================

export function TaskActionsExample5() {
  const tasks = [
    { id: '1', title: 'Design system', status: 'TODO' as TaskStatus },
    { id: '2', title: 'Backend API', status: 'IN_PROGRESS' as TaskStatus },
    { id: '3', title: 'Frontend UI', status: 'REVIEW' as TaskStatus },
  ];

  const handleAction = async (taskId: string, newStatus: string) => {
    console.log(`Action: ${taskId} → ${newStatus}`);
    await new Promise((resolve) => setTimeout(resolve, 500));
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Lista Compacta com Dropdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium">{task.title}</p>
                  <Badge variant="outline" className="mt-1 text-xs">
                    {task.status}
                  </Badge>
                </div>
                <TaskActionsDropdown
                  taskId={task.id}
                  currentStatus={task.status}
                  onAction={handleAction}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// EXAMPLE 6: With API Integration
// ============================================================================

export function TaskActionsExample6() {
  const [status, setStatus] = useState<TaskStatus>('TODO');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAction = async (taskId: string, newStatus: string) => {
    try {
      setLoading(true);
      setError(null);

      // Simulate API call
      const response = await fetch(`/api/tasks/${taskId}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetStatus: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update task status');
      }

      setStatus(newStatus as TaskStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err; // Re-throw to let TaskActions handle it
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Com Integração de API</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              Status Atual:
            </p>
            <Badge>{status}</Badge>
          </div>

          <TaskActions
            taskId="api-task-1"
            currentStatus={status}
            onAction={handleAction}
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
// EXAMPLE 7: Task Detail Page
// ============================================================================

export function TaskActionsExample7() {
  const [task, setTask] = useState({
    id: 'task-123',
    title: 'Implementar autenticação OAuth',
    description: 'Adicionar suporte para login com Google e GitHub',
    status: 'IN_PROGRESS' as TaskStatus,
    assignee: 'Agent-04',
  });

  const handleAction = async (taskId: string, newStatus: string) => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setTask({ ...task, status: newStatus as TaskStatus });
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
              <p className="text-muted-foreground">ID</p>
              <p className="font-mono">{task.id}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Responsável</p>
              <p>{task.assignee}</p>
            </div>
          </div>

          <div className="border-t pt-6">
            <p className="text-sm font-medium mb-3">Ações Disponíveis</p>
            <TaskActions
              taskId={task.id}
              currentStatus={task.status}
              onAction={handleAction}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// ALL EXAMPLES PAGE
// ============================================================================

export default function TaskActionsExamplesPage() {
  return (
    <div className="space-y-12 py-12">
      <div>
        <h1 className="text-3xl font-bold mb-2 text-center">
          TaskActions Component Examples
        </h1>
        <p className="text-center text-muted-foreground">
          Exemplos de uso do componente TaskActions
        </p>
      </div>

      <section>
        <h2 className="text-2xl font-semibold mb-4">
          Example 1: Uso Básico
        </h2>
        <TaskActionsExample1 />
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">
          Example 2: Todos os Status
        </h2>
        <TaskActionsExample2 />
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">
          Example 3: Estado Desabilitado
        </h2>
        <TaskActionsExample3 />
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">
          Example 4: Versão Compacta (Tabelas)
        </h2>
        <TaskActionsExample4 />
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">
          Example 5: Versão Dropdown
        </h2>
        <TaskActionsExample5 />
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">
          Example 7: Página de Detalhes
        </h2>
        <TaskActionsExample7 />
      </section>
    </div>
  );
}
