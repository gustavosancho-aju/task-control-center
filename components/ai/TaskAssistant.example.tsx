'use client';

import { useState } from 'react';
import { TaskAssistant } from './TaskAssistant';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import type { TaskImprovement } from '@/types/ai';

/**
 * Example usage of TaskAssistant component
 */
export function TaskAssistantExample() {
  const [title, setTitle] = useState('Fix bug');
  const [description, setDescription] = useState('The app crashes sometimes');
  const [aiEdited, setAiEdited] = useState(false);
  const [improvementHistory, setImprovementHistory] = useState<TaskImprovement[]>([]);

  // Handle applying improvements
  const handleImprove = (improved: TaskImprovement) => {
    // Update fields
    setTitle(improved.improvedTitle);
    setDescription(improved.improvedDescription);

    // Mark as AI-edited
    setAiEdited(true);

    // Save to history
    setImprovementHistory((prev) => [...prev, improved]);

    // Show success feedback
    alert(`Tarefa melhorada com sucesso!\n\n${improved.suggestions.length} sugestões aplicadas.`);
  };

  // Reset to original
  const handleReset = () => {
    setTitle('Fix bug');
    setDescription('The app crashes sometimes');
    setAiEdited(false);
    setImprovementHistory([]);
  };

  return (
    <div className="max-w-4xl space-y-6">
      <h2 className="text-2xl font-bold">TaskAssistant - Exemplo de Uso</h2>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column: Interactive Example */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Formulário de Tarefa</span>
              {aiEdited && (
                <Badge variant="secondary" className="bg-purple-500/10 text-purple-600">
                  ✨ Editado por IA
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Title Input */}
            <div className="space-y-2">
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Digite o título da tarefa"
              />
            </div>

            {/* Description Textarea */}
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Digite a descrição da tarefa"
                rows={4}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <TaskAssistant
                title={title}
                description={description}
                onImprove={handleImprove}
              />

              {aiEdited && (
                <button
                  onClick={handleReset}
                  className="text-sm text-muted-foreground hover:text-foreground underline"
                >
                  Resetar
                </button>
              )}
            </div>

            {/* Improvement Count */}
            {improvementHistory.length > 0 && (
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  {improvementHistory.length} melhoria{improvementHistory.length > 1 ? 's' : ''} aplicada
                  {improvementHistory.length > 1 ? 's' : ''}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column: History */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Melhorias</CardTitle>
          </CardHeader>
          <CardContent>
            {improvementHistory.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Nenhuma melhoria aplicada ainda.
                <br />
                Use o botão "Melhorar com IA" para começar.
              </div>
            ) : (
              <div className="space-y-4 max-h-[400px] overflow-y-auto">
                {improvementHistory.map((improvement, index) => (
                  <div key={index} className="space-y-2 border-b pb-4 last:border-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-purple-500/10 text-purple-600">
                        Versão {index + 1}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Título:</p>
                      <p className="text-sm text-muted-foreground">{improvement.improvedTitle}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Sugestões ({improvement.suggestions.length}):</p>
                      <ul className="list-disc list-inside text-sm text-muted-foreground">
                        {improvement.suggestions.slice(0, 2).map((suggestion, i) => (
                          <li key={i}>{suggestion}</li>
                        ))}
                        {improvement.suggestions.length > 2 && (
                          <li className="text-xs">
                            +{improvement.suggestions.length - 2} mais...
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Static Examples */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Exemplos de Casos de Uso</h3>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Example 1: Vague Task */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">1. Tarefa Vaga</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-sm font-medium">Entrada:</p>
                <p className="text-xs text-muted-foreground">
                  Título: "Fix bug"
                  <br />
                  Descrição: "Something is broken"
                </p>
              </div>
              <TaskAssistant
                title="Fix bug"
                description="Something is broken"
                onImprove={(improved) => {
                  alert(`Título melhorado:\n${improved.improvedTitle}\n\nDescrição:\n${improved.improvedDescription}`);
                }}
              />
            </CardContent>
          </Card>

          {/* Example 2: Technical Task */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">2. Tarefa Técnica</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-sm font-medium">Entrada:</p>
                <p className="text-xs text-muted-foreground">
                  Título: "Add auth"
                  <br />
                  Descrição: "Users need to login"
                </p>
              </div>
              <TaskAssistant
                title="Add auth"
                description="Users need to login"
                onImprove={(improved) => {
                  console.log('Technical task improved:', improved);
                  alert('Sugestões aplicadas! Veja o console para detalhes.');
                }}
              />
            </CardContent>
          </Card>

          {/* Example 3: Empty Description */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">3. Sem Descrição</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-sm font-medium">Entrada:</p>
                <p className="text-xs text-muted-foreground">
                  Título: "Refactor code"
                  <br />
                  Descrição: <em>(vazio)</em>
                </p>
              </div>
              <TaskAssistant
                title="Refactor code"
                description=""
                onImprove={(improved) => {
                  console.log('Task without description improved:', improved);
                  alert(`A IA gerou descrição e sugestões!\n\n${improved.suggestions.length} sugestões criadas.`);
                }}
              />
            </CardContent>
          </Card>

          {/* Example 4: Feature Request */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">4. Feature Request</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-sm font-medium">Entrada:</p>
                <p className="text-xs text-muted-foreground">
                  Título: "Dark mode"
                  <br />
                  Descrição: "Add dark mode to the app"
                </p>
              </div>
              <TaskAssistant
                title="Dark mode"
                description="Add dark mode to the app"
                onImprove={(improved) => {
                  console.log('Feature request improved:', improved);
                  alert('Feature expandida com detalhes técnicos!');
                }}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Usage Tips */}
      <Card>
        <CardHeader>
          <CardTitle>💡 Dicas de Uso</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li>A IA funciona melhor com títulos descritivos (mínimo 3 caracteres)</li>
            <li>Descrições vazias ou vagas receberão estrutura mais detalhada</li>
            <li>Sugestões adicionais ajudam a quebrar tarefas complexas</li>
            <li>Você pode aplicar as melhorias e depois editar manualmente</li>
            <li>Use o histórico para comparar versões anteriores</li>
            <li>Experimente melhorar tarefas múltiplas vezes para refinar</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
