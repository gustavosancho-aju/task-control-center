'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Sparkles, Loader2, CheckCircle2 } from 'lucide-react';
import type { TaskImprovement } from '@/types/ai';

// ============================================================================
// TYPES
// ============================================================================

interface TaskAssistantProps {
  title: string;
  description: string;
  onImprove: (improved: TaskImprovement) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function TaskAssistant({ title, description, onImprove }: TaskAssistantProps) {
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [improvement, setImprovement] = useState<TaskImprovement | null>(null);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleImprove = async () => {
    if (!title || title.trim().length < 3) {
      alert('O título deve ter pelo menos 3 caracteres');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/ai/improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: description || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao melhorar tarefa');
      }

      const result = await response.json();

      if (!result.success || !result.data) {
        throw new Error('Resposta inválida da API');
      }

      setImprovement(result.data);
      setDialogOpen(true);
    } catch (error) {
      console.error('Error improving task:', error);
      alert(
        error instanceof Error
          ? `Erro: ${error.message}`
          : 'Erro ao melhorar tarefa. Tente novamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (improvement) {
      onImprove(improvement);
      setDialogOpen(false);
      setImprovement(null);
    }
  };

  const handleCancel = () => {
    setDialogOpen(false);
    setImprovement(null);
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      {/* Improve Button */}
      <Button
        onClick={handleImprove}
        disabled={loading}
        variant="outline"
        className="gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Melhorando...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Melhorar com IA
          </>
        )}
      </Button>

      {/* Improvement Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              Sugestões de Melhoria
            </DialogTitle>
            <DialogDescription>
              A IA analisou sua tarefa e sugeriu as melhorias abaixo
            </DialogDescription>
          </DialogHeader>

          {improvement && (
            <div className="space-y-6 py-4">
              {/* Improved Title */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <p className="text-sm font-medium text-muted-foreground">Título Melhorado</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="font-semibold">{improvement.improvedTitle}</p>
                </div>
              </div>

              {/* Improved Description */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <p className="text-sm font-medium text-muted-foreground">Descrição Melhorada</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {improvement.improvedDescription}
                  </p>
                </div>
              </div>

              {/* Suggestions List */}
              {improvement.suggestions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Sugestões Adicionais</p>
                  <div className="space-y-2">
                    {improvement.suggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-2 rounded-lg border bg-card p-3"
                      >
                        <div className="mt-0.5 h-5 w-5 flex items-center justify-center rounded-full bg-purple-500/10 text-purple-600 text-xs font-medium flex-shrink-0">
                          {index + 1}
                        </div>
                        <p className="text-sm text-muted-foreground flex-1">{suggestion}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancelar
            </Button>
            <Button onClick={handleApply}>
              <Sparkles className="h-4 w-4 mr-2" />
              Aplicar Melhorias
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
