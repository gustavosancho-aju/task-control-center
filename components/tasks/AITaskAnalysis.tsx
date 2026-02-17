'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { TaskAnalysis, SubtaskSuggestion, TaskImprovement } from '@/types/ai';
import { COMPLEXITY_COLORS, PRIORITY_COLORS, SEMANTIC_COLORS } from '@/lib/colors';

interface AITaskAnalysisProps {
  taskId: string;
}

/**
 * AI Task Analysis Component
 *
 * Provides AI-powered analysis and improvements for tasks:
 * - Task analysis (agent suggestion, complexity, hours)
 * - Subtask suggestions
 * - Description improvements
 */
export function AITaskAnalysis({ taskId }: AITaskAnalysisProps) {
  const [activeTab, setActiveTab] = useState<'analyze' | 'subtasks' | 'improve'>('analyze');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Analysis state
  const [analysis, setAnalysis] = useState<TaskAnalysis | null>(null);

  // Subtasks state
  const [subtasks, setSubtasks] = useState<SubtaskSuggestion[] | null>(null);

  // Improvement state
  const [improvement, setImprovement] = useState<TaskImprovement | null>(null);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/tasks/${taskId}/analyze`, {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        setAnalysis(result.data.analysis);
      } else {
        setError(result.error || 'Erro ao analisar tarefa');
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor');
      console.error('Analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestSubtasks = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/tasks/${taskId}/subtasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxSubtasks: 5, autoCreate: false }),
      });

      const result = await response.json();

      if (result.success) {
        setSubtasks(result.data.suggestions);
      } else {
        setError(result.error || 'Erro ao sugerir subtarefas');
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor');
      console.error('Subtasks error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleImprove = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/tasks/${taskId}/improve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoApply: false }),
      });

      const result = await response.json();

      if (result.success) {
        setImprovement(result.data.improvement);
      } else {
        setError(result.error || 'Erro ao melhorar descrição');
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor');
      console.error('Improvement error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const getComplexityColor = (complexity: string) => {
    return COMPLEXITY_COLORS[complexity as keyof typeof COMPLEXITY_COLORS] ?? 'bg-muted text-muted-foreground border-border';
  };

  const getPriorityColor = (priority: string) => {
    const colors = PRIORITY_COLORS[priority as keyof typeof PRIORITY_COLORS];
    return colors?.soft ?? '';
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <Card className={`${SEMANTIC_COLORS.aiAccent} bg-gradient-to-br ${SEMANTIC_COLORS.aiBg} to-transparent`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className={`h-5 w-5 ${SEMANTIC_COLORS.ai}`} />
          Análise com IA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tabs */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={activeTab === 'analyze' ? 'default' : 'outline'}
            onClick={() => setActiveTab('analyze')}
          >
            Analisar
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'subtasks' ? 'default' : 'outline'}
            onClick={() => setActiveTab('subtasks')}
          >
            Subtarefas
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'improve' ? 'default' : 'outline'}
            onClick={() => setActiveTab('improve')}
          >
            Melhorar
          </Button>
        </div>

        {/* Error Message */}
        {error && (
          <div className={`flex items-start gap-2 p-3 rounded-lg ${SEMANTIC_COLORS.errorBg}`}>
            <AlertCircle className={`h-5 w-5 flex-shrink-0 mt-0.5 ${SEMANTIC_COLORS.error}`} />
            <p className={`text-sm ${SEMANTIC_COLORS.error}`}>{error}</p>
          </div>
        )}

        {/* Analyze Tab */}
        {activeTab === 'analyze' && (
          <div className="space-y-4">
            {!analysis && (
              <Button onClick={handleAnalyze} disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analisando...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Analisar Tarefa
                  </>
                )}
              </Button>
            )}

            {analysis && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className={`h-5 w-5 ${SEMANTIC_COLORS.success}`} />
                  <span className={`text-sm font-medium ${SEMANTIC_COLORS.success}`}>Análise concluída</span>
                </div>

                {/* Agent Suggestion */}
                {analysis.suggestedAgent && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Agente Sugerido</p>
                    <Badge className={SEMANTIC_COLORS.aiBadge}>
                      {analysis.suggestedAgent}
                    </Badge>
                  </div>
                )}

                {/* Estimated Hours */}
                {analysis.estimatedHours && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Horas Estimadas</p>
                    <p className="text-sm font-medium">{analysis.estimatedHours}h</p>
                  </div>
                )}

                {/* Complexity */}
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Complexidade</p>
                  <Badge className={getComplexityColor(analysis.complexity)}>
                    {analysis.complexity}
                  </Badge>
                </div>

                {/* Tags */}
                {analysis.tags.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Tags</p>
                    <div className="flex flex-wrap gap-1">
                      {analysis.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reasoning */}
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Raciocínio da IA</p>
                  <p className="text-sm bg-muted/50 p-3 rounded-lg">{analysis.reasoning}</p>
                </div>

                <Button onClick={handleAnalyze} variant="outline" size="sm" className="w-full">
                  Analisar Novamente
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Subtasks Tab */}
        {activeTab === 'subtasks' && (
          <div className="space-y-4">
            {!subtasks && (
              <Button onClick={handleSuggestSubtasks} disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Gerando Sugestões...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Sugerir Subtarefas
                  </>
                )}
              </Button>
            )}

            {subtasks && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className={`h-5 w-5 ${SEMANTIC_COLORS.success}`} />
                  <span className={`text-sm font-medium ${SEMANTIC_COLORS.success}`}>
                    {subtasks.length} subtarefas sugeridas
                  </span>
                </div>

                <div className="space-y-2">
                  {subtasks.map((subtask, index) => (
                    <div key={index} className="p-3 bg-muted/50 rounded-lg space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-medium">{subtask.title}</h4>
                        <Badge className={getPriorityColor(subtask.priority)} variant="outline">
                          {subtask.priority}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{subtask.description}</p>
                      {subtask.estimatedHours && (
                        <p className="text-xs text-muted-foreground">
                          ⏱️ {subtask.estimatedHours}h estimadas
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <Button onClick={handleSuggestSubtasks} variant="outline" size="sm" className="w-full">
                  Gerar Novas Sugestões
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Improve Tab */}
        {activeTab === 'improve' && (
          <div className="space-y-4">
            {!improvement && (
              <Button onClick={handleImprove} disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Gerando Melhorias...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Melhorar Descrição
                  </>
                )}
              </Button>
            )}

            {improvement && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className={`h-5 w-5 ${SEMANTIC_COLORS.success}`} />
                  <span className={`text-sm font-medium ${SEMANTIC_COLORS.success}`}>Melhorias geradas</span>
                </div>

                {/* Improved Title */}
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Título Melhorado</p>
                  <p className="text-sm font-medium bg-muted/50 p-3 rounded-lg">
                    {improvement.improvedTitle}
                  </p>
                </div>

                {/* Improved Description */}
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Descrição Melhorada</p>
                  <p className="text-sm bg-muted/50 p-3 rounded-lg whitespace-pre-wrap">
                    {improvement.improvedDescription}
                  </p>
                </div>

                {/* Suggestions */}
                {improvement.suggestions.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">O que foi melhorado</p>
                    <ul className="text-sm space-y-1">
                      {improvement.suggestions.map((suggestion, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className={SEMANTIC_COLORS.ai}>•</span>
                          <span>{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <Button onClick={handleImprove} variant="outline" size="sm" className="w-full">
                  Gerar Novas Melhorias
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
