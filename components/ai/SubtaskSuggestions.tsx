'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { ListTodo, Plus, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import type { SubtaskSuggestion } from '@/types/ai';

// ============================================================================
// TYPES
// ============================================================================

interface SubtaskSuggestionsProps {
  suggestions: SubtaskSuggestion[] | null;
  loading: boolean;
  onCreateSubtask: (subtask: SubtaskSuggestion) => Promise<void>;
  onCreateAll: (subtasks: SubtaskSuggestion[]) => Promise<void>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PRIORITY_CONFIG = {
  LOW: {
    label: 'Baixa',
    className: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
  },
  MEDIUM: {
    label: 'Média',
    className: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  },
  HIGH: {
    label: 'Alta',
    className: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  },
  URGENT: {
    label: 'Urgente',
    className: 'bg-red-500/10 text-red-600 border-red-500/20',
  },
} as const;

// ============================================================================
// COMPONENT
// ============================================================================

export function SubtaskSuggestions({
  suggestions,
  loading,
  onCreateSubtask,
  onCreateAll,
}: SubtaskSuggestionsProps) {
  const [creatingIndex, setCreatingIndex] = useState<number | null>(null);
  const [creatingAll, setCreatingAll] = useState(false);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleCreateSubtask = async (subtask: SubtaskSuggestion, index: number) => {
    setCreatingIndex(index);
    try {
      await onCreateSubtask(subtask);
    } finally {
      setCreatingIndex(null);
    }
  };

  const handleCreateAll = async () => {
    if (!suggestions || suggestions.length === 0) return;

    setCreatingAll(true);
    try {
      await onCreateAll(suggestions);
    } finally {
      setCreatingAll(false);
    }
  };

  // ============================================================================
  // RENDER: LOADING STATE
  // ============================================================================

  if (loading) {
    return (
      <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            📋 Subtarefas Sugeridas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-12" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  // ============================================================================
  // RENDER: EMPTY STATE
  // ============================================================================

  if (!suggestions || suggestions.length === 0) {
    return (
      <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListTodo className="h-5 w-5 text-blue-600" />
            📋 Subtarefas Sugeridas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-3 rounded-full bg-blue-500/10 p-4">
              <ListTodo className="h-8 w-8 text-blue-600" />
            </div>
            <p className="text-sm text-muted-foreground">
              {suggestions === null
                ? 'Clique em Sugerir para obter decomposição da tarefa'
                : 'Nenhuma subtarefa sugerida'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ============================================================================
  // RENDER: SUGGESTIONS LIST
  // ============================================================================

  return (
    <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListTodo className="h-5 w-5 text-blue-600" />
          📋 Subtarefas Sugeridas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Success Indicator */}
        <div className="flex items-center gap-2 text-sm text-green-600">
          <CheckCircle2 className="h-4 w-4" />
          <span className="font-medium">
            {suggestions.length} {suggestions.length === 1 ? 'subtarefa sugerida' : 'subtarefas sugeridas'}
          </span>
        </div>

        {/* Subtasks List */}
        <div className="space-y-3">
          {suggestions.map((subtask, index) => {
            const priorityConfig = PRIORITY_CONFIG[subtask.priority];
            const isCreating = creatingIndex === index;

            return (
              <div
                key={index}
                className="rounded-lg border bg-card p-4 space-y-3 hover:bg-accent/5 transition-colors"
              >
                {/* Title and Create Button */}
                <div className="flex items-start justify-between gap-3">
                  <h4 className="font-semibold leading-tight flex-1">{subtask.title}</h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCreateSubtask(subtask, index)}
                    disabled={isCreating || creatingAll}
                    className="flex-shrink-0"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                        Criando...
                      </>
                    ) : (
                      <>
                        <Plus className="h-3 w-3 mr-1.5" />
                        Criar
                      </>
                    )}
                  </Button>
                </div>

                {/* Description */}
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {subtask.description}
                </p>

                {/* Priority and Hours */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={priorityConfig.className}>
                    {priorityConfig.label}
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{subtask.estimatedHours}h</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>

      {/* Footer with Create All Button */}
      <Separator />
      <CardFooter className="pt-4">
        <Button
          onClick={handleCreateAll}
          disabled={creatingAll || creatingIndex !== null}
          className="w-full"
        >
          {creatingAll ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Criando todas...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Criar Todas ({suggestions.length})
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
