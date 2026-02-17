"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Bot, ListTodo } from "lucide-react"
import { TaskAnalysisCard } from "@/components/ai/TaskAnalysisCard"
import { SubtaskSuggestions } from "@/components/ai/SubtaskSuggestions"
import { TaskAssistant } from "@/components/ai/TaskAssistant"
import type { TaskAnalysis, SubtaskSuggestion, TaskImprovement } from "@/types/ai"
import { notifyAIAnalysis, notifyError } from "@/lib/notifications"

interface TaskCreationFormProps {
  onSubmit: (task: { title: string; description?: string; priority: string; agentId?: string }) => Promise<void>
  onCancel?: () => void
}

export function TaskCreationForm({ onSubmit, onCancel }: TaskCreationFormProps) {
  // Form states
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState("MEDIUM")
  const [loading, setLoading] = useState(false)

  // AI states
  const [analysis, setAnalysis] = useState<TaskAnalysis | null>(null)
  const [analyzingTask, setAnalyzingTask] = useState(false)
  const [subtasks, setSubtasks] = useState<SubtaskSuggestion[] | null>(null)
  const [loadingSubtasks, setLoadingSubtasks] = useState(false)
  const [suggestedAgentId, setSuggestedAgentId] = useState<string | undefined>(undefined)

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        agentId: suggestedAgentId
      })
      // Reset form
      setTitle("")
      setDescription("")
      setPriority("MEDIUM")
      setAnalysis(null)
      setSubtasks(null)
      setSuggestedAgentId(undefined)
    } finally {
      setLoading(false)
    }
  }

  const handleAnalyze = async () => {
    if (!title.trim() || title.trim().length < 3) {
      alert("O título deve ter pelo menos 3 caracteres para análise")
      return
    }

    setAnalyzingTask(true)
    try {
      const response = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
        }),
      })

      if (!response.ok) {
        throw new Error("Erro ao analisar tarefa")
      }

      const result = await response.json()
      if (result.success && result.data) {
        setAnalysis(result.data)
        notifyAIAnalysis(result.data.suggestedAgent)
      }
    } catch (error) {
      console.error("Error analyzing task:", error)
      notifyError("Erro ao analisar tarefa", "Tente novamente.")
    } finally {
      setAnalyzingTask(false)
    }
  }

  const handleSuggestSubtasks = async () => {
    if (!title.trim() || title.trim().length < 3) {
      alert("O título deve ter pelo menos 3 caracteres para sugestões")
      return
    }

    setLoadingSubtasks(true)
    try {
      const response = await fetch("/api/ai/subtasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          maxSubtasks: 5,
        }),
      })

      if (!response.ok) {
        throw new Error("Erro ao sugerir subtarefas")
      }

      const result = await response.json()
      if (result.success && result.data) {
        setSubtasks(result.data)
      }
    } catch (error) {
      console.error("Error suggesting subtasks:", error)
      alert("Erro ao sugerir subtarefas. Tente novamente.")
    } finally {
      setLoadingSubtasks(false)
    }
  }

  const handleApplySuggestion = (field: string, value: any) => {
    if (field === "agent") {
      // Map agent name to ID (você pode ajustar conforme sua lógica)
      const agentMap: Record<string, string> = {
        MAESTRO: "maestro-id",
        SENTINEL: "sentinel-id",
        ARCHITECTON: "architecton-id",
        PIXEL: "pixel-id",
      }
      setSuggestedAgentId(agentMap[value] || undefined)
      alert(`Agente ${value} será aplicado ao criar a tarefa`)
    }

    if (field === "estimatedHours") {
      // Você pode adicionar um campo de horas estimadas se necessário
      alert(`Horas estimadas: ${value}h (adicione campo se necessário)`)
    }

    if (field === "tags") {
      // Você pode adicionar campo de tags se necessário
      alert(`Tags sugeridas: ${value.join(", ")} (adicione campo se necessário)`)
    }
  }

  const handleImproveTask = (improved: TaskImprovement) => {
    setTitle(improved.improvedTitle)
    setDescription(improved.improvedDescription)

    // Opcional: re-analisar após melhorar
    // setAnalysis(null)
    // setSubtasks(null)
  }

  const handleCreateSubtask = async (subtask: SubtaskSuggestion) => {
    // Criar subtarefa via API
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: subtask.title,
          description: subtask.description,
          priority: subtask.priority,
          estimatedHours: subtask.estimatedHours,
          status: "TODO",
        }),
      })

      if (!response.ok) {
        throw new Error("Erro ao criar subtarefa")
      }

      // Remover da lista
      setSubtasks((prev) => prev?.filter((s) => s !== subtask) ?? null)
      alert(`Subtarefa "${subtask.title}" criada com sucesso!`)
    } catch (error) {
      console.error("Error creating subtask:", error)
      alert("Erro ao criar subtarefa. Tente novamente.")
    }
  }

  const handleCreateAllSubtasks = async (subtasksToCreate: SubtaskSuggestion[]) => {
    try {
      await Promise.all(
        subtasksToCreate.map((subtask) =>
          fetch("/api/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: subtask.title,
              description: subtask.description,
              priority: subtask.priority,
              estimatedHours: subtask.estimatedHours,
              status: "TODO",
            }),
          })
        )
      )

      setSubtasks([])
      alert(`${subtasksToCreate.length} subtarefas criadas com sucesso!`)
    } catch (error) {
      console.error("Error creating all subtasks:", error)
      alert("Erro ao criar subtarefas. Tente novamente.")
    }
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Main Form Card */}
      <Card>
        <CardHeader>
          <CardTitle>Nova Tarefa</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title with AI Buttons */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Titulo da tarefa"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="flex-1"
                />
                <TaskAssistant
                  title={title}
                  description={description}
                  onImprove={handleImproveTask}
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <Textarea
                placeholder="Descricao (opcional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>

            {/* Priority */}
            <div>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue placeholder="Prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Baixa</SelectItem>
                  <SelectItem value="MEDIUM">Media</SelectItem>
                  <SelectItem value="HIGH">Alta</SelectItem>
                  <SelectItem value="URGENT">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* AI Actions */}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleAnalyze}
                disabled={analyzingTask || !title.trim() || title.trim().length < 3}
                className="gap-2"
              >
                <Bot className="h-4 w-4" />
                {analyzingTask ? "Analisando..." : "🤖 Analisar"}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleSuggestSubtasks}
                disabled={loadingSubtasks || !title.trim() || title.trim().length < 3}
                className="gap-2"
              >
                <ListTodo className="h-4 w-4" />
                {loadingSubtasks ? "Sugerindo..." : "📋 Sugerir Subtarefas"}
              </Button>
            </div>

            <Separator />

            {/* Form Actions */}
            <div className="flex gap-2 justify-end">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancelar
                </Button>
              )}
              <Button type="submit" disabled={loading || !title.trim()}>
                {loading ? "Criando..." : "Criar Tarefa"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* AI Analysis Section */}
      {(analysis || analyzingTask) && (
        <div className="grid gap-6 lg:grid-cols-2">
          <TaskAnalysisCard
            analysis={analysis}
            loading={analyzingTask}
            onApplySuggestion={handleApplySuggestion}
          />
        </div>
      )}

      {/* Subtasks Suggestions Section */}
      {(subtasks !== null || loadingSubtasks) && (
        <SubtaskSuggestions
          suggestions={subtasks}
          loading={loadingSubtasks}
          onCreateSubtask={handleCreateSubtask}
          onCreateAll={handleCreateAllSubtasks}
        />
      )}
    </div>
  )
}
