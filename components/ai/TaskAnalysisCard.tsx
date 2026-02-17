'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, Clock, Target, CheckCircle2 } from 'lucide-react';
import type { TaskAnalysis } from '@/types/ai';

// ============================================================================
// TYPES
// ============================================================================

interface TaskAnalysisCardProps {
  analysis: TaskAnalysis | null;
  loading: boolean;
  onApplySuggestion?: (field: string, value: any) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const AGENT_EMOJIS = {
  MAESTRO: '🎯',
  SENTINEL: '🛡️',
  ARCHITECTON: '🏗️',
  PIXEL: '🎨',
} as const;

const AGENT_LABELS = {
  MAESTRO: 'Maestro - Orquestrador',
  SENTINEL: 'Sentinel - Qualidade',
  ARCHITECTON: 'Architecton - Arquiteto',
  PIXEL: 'Pixel - Designer',
} as const;

const COMPLEXITY_CONFIG = {
  LOW: {
    label: 'Baixa',
    className: 'bg-green-500/10 text-green-600 border-green-500/20',
  },
  MEDIUM: {
    label: 'Média',
    className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  },
  HIGH: {
    label: 'Alta',
    className: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  },
  VERY_HIGH: {
    label: 'Muito Alta',
    className: 'bg-red-500/10 text-red-600 border-red-500/20',
  },
} as const;

// ============================================================================
// COMPONENT
// ============================================================================

export function TaskAnalysisCard({
  analysis,
  loading,
  onApplySuggestion,
}: TaskAnalysisCardProps) {
  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleApplySuggestions = () => {
    if (!analysis || !onApplySuggestion) return;

    // Apply suggested agent
    if (analysis.suggestedAgent) {
      onApplySuggestion('agent', analysis.suggestedAgent);
    }

    // Apply estimated hours
    if (analysis.estimatedHours) {
      onApplySuggestion('estimatedHours', analysis.estimatedHours);
    }

    // Apply tags
    if (analysis.tags && analysis.tags.length > 0) {
      onApplySuggestion('tags', analysis.tags);
    }
  };

  // ============================================================================
  // RENDER: LOADING STATE
  // ============================================================================

  if (loading) {
    return (
      <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
            Análise IA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-24" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-16" />
          </div>
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  // ============================================================================
  // RENDER: EMPTY STATE
  // ============================================================================

  if (!analysis) {
    return (
      <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            Análise IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-3 rounded-full bg-purple-500/10 p-4">
              <Sparkles className="h-8 w-8 text-purple-600" />
            </div>
            <p className="text-sm text-muted-foreground">
              Clique em Analisar para obter sugestões da IA
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ============================================================================
  // RENDER: ANALYSIS RESULTS
  // ============================================================================

  const complexityConfig = COMPLEXITY_CONFIG[analysis.complexity];

  return (
    <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          Análise IA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Success Indicator */}
        <div className="flex items-center gap-2 text-sm text-green-600">
          <CheckCircle2 className="h-4 w-4" />
          <span className="font-medium">Análise concluída</span>
        </div>

        {/* Suggested Agent */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium text-muted-foreground">Agente Sugerido</p>
          </div>
          <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20 text-sm">
            {AGENT_EMOJIS[analysis.suggestedAgent]}{' '}
            {AGENT_LABELS[analysis.suggestedAgent]}
          </Badge>
        </div>

        {/* Estimated Hours */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium text-muted-foreground">Horas Estimadas</p>
          </div>
          <p className="text-lg font-semibold">{analysis.estimatedHours}h</p>
        </div>

        {/* Complexity */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Complexidade</p>
          <Badge variant="outline" className={complexityConfig.className}>
            {complexityConfig.label}
          </Badge>
        </div>

        {/* Tags */}
        {analysis.tags.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Tags</p>
            <div className="flex flex-wrap gap-1.5">
              {analysis.tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Reasoning */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Raciocínio</p>
          <p className="text-sm leading-relaxed text-muted-foreground/90 bg-muted/30 p-3 rounded-lg">
            {analysis.reasoning}
          </p>
        </div>

        {/* Apply Suggestions Button */}
        {onApplySuggestion && (
          <div className="pt-2">
            <Button
              onClick={handleApplySuggestions}
              className="w-full"
              variant="default"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Aplicar Sugestões
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
