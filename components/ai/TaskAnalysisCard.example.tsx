'use client';

import { useState } from 'react';
import { TaskAnalysisCard } from './TaskAnalysisCard';
import { Button } from '@/components/ui/button';
import type { TaskAnalysis } from '@/types/ai';

/**
 * Example usage of TaskAnalysisCard component
 */
export function TaskAnalysisCardExample() {
  const [analysis, setAnalysis] = useState<TaskAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  // Simulate analysis request
  const handleAnalyze = async () => {
    setLoading(true);
    setAnalysis(null);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Mock analysis result
    setAnalysis({
      suggestedAgent: 'ARCHITECTON',
      estimatedHours: 12,
      complexity: 'HIGH',
      tags: ['oauth', 'authentication', 'security', 'integration', 'backend'],
      reasoning:
        'Esta tarefa envolve decisões arquiteturais críticas sobre autenticação e segurança, incluindo configuração de provedores OAuth, gestão de tokens, fluxos de autorização e integrações com APIs externas. ARCHITECTON é o mais adequado por lidar com aspectos estruturais de segurança e integrações.',
    });

    setLoading(false);
  };

  // Handle applying suggestions to the task form
  const handleApplySuggestion = (field: string, value: any) => {
    console.log(`Applying suggestion: ${field} =`, value);

    // In a real app, you would update the form fields here
    // For example:
    // if (field === 'agent') {
    //   setSelectedAgent(value);
    // }
    // if (field === 'estimatedHours') {
    //   setEstimatedHours(value);
    // }
    // if (field === 'tags') {
    //   setTags(value);
    // }

    alert(`Sugestão aplicada!\n\nCampo: ${field}\nValor: ${JSON.stringify(value, null, 2)}`);
  };

  return (
    <div className="max-w-2xl space-y-4">
      <h2 className="text-2xl font-bold">TaskAnalysisCard - Exemplo de Uso</h2>

      <div className="space-y-4">
        <Button onClick={handleAnalyze} disabled={loading}>
          {loading ? 'Analisando...' : 'Analisar Tarefa'}
        </Button>

        <TaskAnalysisCard
          analysis={analysis}
          loading={loading}
          onApplySuggestion={handleApplySuggestion}
        />
      </div>

      <div className="mt-8 space-y-4">
        <h3 className="text-lg font-semibold">Estados do Componente</h3>

        <div className="space-y-2">
          <h4 className="font-medium">1. Estado Vazio (Inicial)</h4>
          <TaskAnalysisCard
            analysis={null}
            loading={false}
          />
        </div>

        <div className="space-y-2">
          <h4 className="font-medium">2. Estado de Loading</h4>
          <TaskAnalysisCard
            analysis={null}
            loading={true}
          />
        </div>

        <div className="space-y-2">
          <h4 className="font-medium">3. Análise com Complexidade BAIXA</h4>
          <TaskAnalysisCard
            analysis={{
              suggestedAgent: 'PIXEL',
              estimatedHours: 2,
              complexity: 'LOW',
              tags: ['ui', 'css', 'styling'],
              reasoning: 'Tarefa simples de ajustes visuais.',
            }}
            loading={false}
          />
        </div>

        <div className="space-y-2">
          <h4 className="font-medium">4. Análise com Complexidade MÉDIA</h4>
          <TaskAnalysisCard
            analysis={{
              suggestedAgent: 'SENTINEL',
              estimatedHours: 6,
              complexity: 'MEDIUM',
              tags: ['testing', 'qa', 'automation'],
              reasoning: 'Tarefa de testes automatizados com complexidade moderada.',
            }}
            loading={false}
          />
        </div>

        <div className="space-y-2">
          <h4 className="font-medium">5. Análise com Complexidade MUITO ALTA</h4>
          <TaskAnalysisCard
            analysis={{
              suggestedAgent: 'MAESTRO',
              estimatedHours: 40,
              complexity: 'VERY_HIGH',
              tags: ['microservices', 'refactoring', 'architecture', 'distributed-systems'],
              reasoning:
                'Migração de monolito para microserviços é extremamente complexa, envolvendo múltiplas equipes e sistemas.',
            }}
            loading={false}
            onApplySuggestion={(field, value) => {
              console.log('Applying:', field, value);
            }}
          />
        </div>
      </div>
    </div>
  );
}
