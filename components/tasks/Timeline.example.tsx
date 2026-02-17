/**
 * Timeline Component - Usage Examples
 * Demonstrates how to use the Timeline component in different scenarios
 */

'use client';

import React from 'react';
import { Timeline, TimelineCompact, type TimelineItem } from './Timeline';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

// ============================================================================
// EXAMPLE DATA
// ============================================================================

const exampleTimeline: TimelineItem[] = [
  {
    id: '1',
    fromStatus: 'REVIEW',
    toStatus: 'DONE',
    changedAt: new Date().toISOString(),
    notes: 'Tarefa concluída com sucesso após revisão final.',
  },
  {
    id: '2',
    fromStatus: 'IN_PROGRESS',
    toStatus: 'REVIEW',
    changedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    notes: 'Implementação finalizada. Pronto para revisão do time.',
  },
  {
    id: '3',
    fromStatus: 'TODO',
    toStatus: 'IN_PROGRESS',
    changedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
    notes: null,
  },
  {
    id: '4',
    fromStatus: null,
    toStatus: 'TODO',
    changedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    notes: 'Tarefa criada e adicionada ao backlog.',
  },
];

const blockedTimeline: TimelineItem[] = [
  {
    id: '1',
    fromStatus: 'IN_PROGRESS',
    toStatus: 'BLOCKED',
    changedAt: new Date().toISOString(),
    notes: 'Bloqueado aguardando aprovação do cliente para prosseguir com as mudanças.',
  },
  {
    id: '2',
    fromStatus: 'TODO',
    toStatus: 'IN_PROGRESS',
    changedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    notes: null,
  },
  {
    id: '3',
    fromStatus: null,
    toStatus: 'TODO',
    changedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    notes: null,
  },
];

const emptyTimeline: TimelineItem[] = [];

// ============================================================================
// EXAMPLE 1: Full Timeline in Task Detail Page
// ============================================================================

export function TimelineExample1() {
  return (
    <div className="max-w-3xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Histórico da Tarefa</CardTitle>
        </CardHeader>
        <CardContent>
          <Timeline items={exampleTimeline} />
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// EXAMPLE 2: Timeline with Blocked Status
// ============================================================================

export function TimelineExample2() {
  return (
    <div className="max-w-3xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Tarefa Bloqueada</CardTitle>
        </CardHeader>
        <CardContent>
          <Timeline items={blockedTimeline} />
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// EXAMPLE 3: Empty Timeline
// ============================================================================

export function TimelineExample3() {
  return (
    <div className="max-w-3xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Nova Tarefa</CardTitle>
        </CardHeader>
        <CardContent>
          <Timeline items={emptyTimeline} />
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// EXAMPLE 4: Compact Timeline in Card
// ============================================================================

export function TimelineExample4() {
  return (
    <div className="max-w-md mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Atividade Recente</CardTitle>
        </CardHeader>
        <CardContent>
          <TimelineCompact items={exampleTimeline} />
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// EXAMPLE 5: Timeline with Real-time Data (using useState)
// ============================================================================

export function TimelineExample5() {
  // In a real app, this would come from an API or state management
  const [items, setItems] = React.useState<TimelineItem[]>(exampleTimeline);

  const addTimelineItem = () => {
    const newItem: TimelineItem = {
      id: String(Date.now()),
      fromStatus: 'IN_PROGRESS',
      toStatus: 'REVIEW',
      changedAt: new Date().toISOString(),
      notes: 'Nova mudança de status adicionada.',
    };

    setItems([newItem, ...items]);
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <button
        onClick={addTimelineItem}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
      >
        Adicionar Item
      </button>

      <Card>
        <CardHeader>
          <CardTitle>Timeline Dinâmica</CardTitle>
        </CardHeader>
        <CardContent>
          <Timeline items={items} />
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// EXAMPLE 6: Timeline from API Response
// ============================================================================

export function TimelineExample6() {
  const [items, setItems] = React.useState<TimelineItem[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // Simulate API call
    const fetchTimeline = async () => {
      try {
        setLoading(true);
        // const response = await fetch('/api/tasks/123/timeline');
        // const data = await response.json();

        // Simulating API delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        setItems(exampleTimeline);
      } catch (error) {
        console.error('Error fetching timeline:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTimeline();
  }, []);

  return (
    <div className="max-w-3xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Timeline da API</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Carregando...</p>
            </div>
          ) : (
            <Timeline items={items} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// EXAMPLE 7: Side-by-side Comparison (Full vs Compact)
// ============================================================================

export function TimelineExample7() {
  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Timeline Completa</CardTitle>
          </CardHeader>
          <CardContent>
            <Timeline items={exampleTimeline} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Timeline Compacta</CardTitle>
          </CardHeader>
          <CardContent>
            <TimelineCompact items={exampleTimeline} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================================================
// EXAMPLE 8: Custom Styling
// ============================================================================

export function TimelineExample8() {
  return (
    <div className="max-w-3xl mx-auto p-6">
      <Card className="border-2 border-primary/20">
        <CardHeader className="bg-primary/5">
          <CardTitle className="text-primary">Timeline Personalizada</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <Timeline items={exampleTimeline} />
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// ALL EXAMPLES PAGE
// ============================================================================

export default function TimelineExamplesPage() {
  return (
    <div className="space-y-12 py-12">
      <div>
        <h1 className="text-3xl font-bold mb-8 text-center">
          Timeline Component Examples
        </h1>
      </div>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Example 1: Full Timeline</h2>
        <TimelineExample1 />
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Example 2: Blocked Task</h2>
        <TimelineExample2 />
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Example 3: Empty Timeline</h2>
        <TimelineExample3 />
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Example 4: Compact Version</h2>
        <TimelineExample4 />
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">
          Example 7: Full vs Compact Comparison
        </h2>
        <TimelineExample7 />
      </section>
    </div>
  );
}
