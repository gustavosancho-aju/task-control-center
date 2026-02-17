'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Loader2,
  AlertCircle,
  Bot,
  ListTodo,
  Sparkles,
  ExternalLink,
  Play,
  Pause,
  X,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Zap,
  Star,
  MessageSquare,
  Paperclip,
  Shield,
} from 'lucide-react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/tasks/StatusBadge';
import { PriorityBadge } from '@/components/tasks/PriorityBadge';
import { AgentSelector } from '@/components/tasks/AgentSelector';
import { TaskActions } from '@/components/tasks/TaskActions';
import { Timeline, type TimelineItem } from '@/components/tasks/Timeline';
import { TaskAnalysisCard } from '@/components/ai/TaskAnalysisCard';
import { SubtaskSuggestions } from '@/components/ai/SubtaskSuggestions';
import { ExecutionProgress } from '@/components/executions/ExecutionProgress';
import { ExecutionLogs } from '@/components/executions/ExecutionLogs';
import { CommentList } from '@/components/comments/CommentList';
import { AttachmentList } from '@/components/attachments/AttachmentList';
import { AuditTimeline } from '@/components/audit/AuditTimeline';
import { SubtaskList } from '@/components/subtasks/SubtaskList';
import type { TaskStatus } from '@/lib/workflow/state-machine';
import type { TaskAnalysis, SubtaskSuggestion } from '@/types/ai';
import {
  notifyStatusChanged,
  notifyTaskAssigned,
  notifyTaskCompleted,
  notifyAIAnalysis,
  notifyError,
  notifySuccess,
  notifyInfo,
} from '@/lib/notifications';
import { EXECUTION_COLORS, SEMANTIC_COLORS, SELECTED_BADGE } from '@/lib/colors';
import { TaskDetailSkeleton } from '@/components/ui/skeletons';

// ============================================================================
// TYPES
// ============================================================================

interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  agentId?: string | null;
  agentName?: string | null;
  createdAt: string;
  updatedAt: string;
  dueDate?: string | null;
  completedAt?: string | null;
  estimatedHours?: number | null;
  actualHours?: number | null;
  statusHistory?: TimelineItem[];
  parentId?: string | null;
}

interface Subtask {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  createdAt: string;
  estimatedHours?: number | null;
}

type ExecutionStatus = 'QUEUED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

interface Execution {
  id: string;
  taskId: string;
  agentId: string;
  status: ExecutionStatus;
  startedAt: string | null;
  completedAt: string | null;
  progress: number;
  result?: string | null;
  error?: string | null;
  agent?: { id: string; name: string; role: string };
}

interface Agent {
  id: string;
  name: string;
  role: string;
  isActive: boolean;
}

// ============================================================================
// STATUS HELPERS
// ============================================================================

const NEXT_STATUS_MAP: Record<string, string> = {
  TODO: 'IN_PROGRESS',
  IN_PROGRESS: 'REVIEW',
  REVIEW: 'DONE',
};

// ============================================================================
// TASK DETAIL PAGE
// ============================================================================

export default function TaskDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const taskId = params.id;

  // Task states
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // AI Analysis states
  const [analysis, setAnalysis] = useState<TaskAnalysis | null>(null);
  const [analyzingTask, setAnalyzingTask] = useState(false);

  // Subtasks states
  const [subtaskSuggestions, setSubtaskSuggestions] = useState<SubtaskSuggestion[] | null>(null);
  const [loadingSubtasks, setLoadingSubtasks] = useState(false);
  const [existingSubtasks, setExistingSubtasks] = useState<Subtask[]>([]);
  const [loadingExistingSubtasks, setLoadingExistingSubtasks] = useState(false);

  // Execution states
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loadingExecutions, setLoadingExecutions] = useState(false);
  const [executingTask, setExecutingTask] = useState(false);
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [expandedExecution, setExpandedExecution] = useState<string | null>(null);
  const executionPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Audit states
  const [auditEntries, setAuditEntries] = useState<{ id: string; entityType: string; entityId: string; action: string; changes?: Record<string, { from: unknown; to: unknown }> | null; performedBy: string; createdAt: string }[]>([]);
  const [auditExpanded, setAuditExpanded] = useState(false);

  // Feedback states
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [feedbackExecutionId, setFeedbackExecutionId] = useState<string | null>(null);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackHover, setFeedbackHover] = useState(0);
  const [feedbackComments, setFeedbackComments] = useState('');
  const [feedbackImprovements, setFeedbackImprovements] = useState<string[]>([]);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // ============================================================================
  // DERIVED STATE
  // ============================================================================

  const activeExecution = executions.find(
    (e) => e.status === 'RUNNING' || e.status === 'PAUSED' || e.status === 'QUEUED'
  );
  const latestExecution = executions[0] ?? null;
  const pastExecutions = executions.filter(
    (e) => e.status !== 'RUNNING' && e.status !== 'PAUSED' && e.status !== 'QUEUED'
  );

  // ============================================================================
  // FETCH TASK DATA
  // ============================================================================

  const fetchExistingSubtasks = useCallback(async () => {
    try {
      setLoadingExistingSubtasks(true);
      const response = await fetch(`/api/tasks?parentId=${taskId}`);
      if (!response.ok) throw new Error('Erro ao buscar subtarefas');
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setExistingSubtasks(data.data);
      }
    } catch (err) {
      console.error('Error fetching subtasks:', err);
    } finally {
      setLoadingExistingSubtasks(false);
    }
  }, [taskId]);

  const fetchExecutions = useCallback(async () => {
    try {
      setLoadingExecutions(true);
      const response = await fetch(`/api/executions?taskId=${taskId}&limit=20`);
      if (!response.ok) return;
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setExecutions(data.data);
      }
    } catch (err) {
      console.error('Error fetching executions:', err);
    } finally {
      setLoadingExecutions(false);
    }
  }, [taskId]);

  const fetchAuditLogs = useCallback(async () => {
    try {
      const res = await fetch(`/api/audit?entityType=Task&entityId=${taskId}&limit=30`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) setAuditEntries(data.data);
    } catch {
      // silent
    }
  }, [taskId]);

  useEffect(() => {
    const fetchTask = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/tasks/${taskId}`);
        if (response.status === 404) {
          setError('Tarefa não encontrada');
          return;
        }
        if (!response.ok) throw new Error('Erro ao buscar tarefa');
        const data = await response.json();
        if (data.success) {
          setTask(data.data);
          fetchExistingSubtasks();
          fetchExecutions();
          fetchAuditLogs();
        } else {
          throw new Error(data.error || 'Erro ao buscar tarefa');
        }
      } catch (err) {
        console.error('Error fetching task:', err);
        setError(err instanceof Error ? err.message : 'Erro desconhecido ao buscar tarefa');
      } finally {
        setLoading(false);
      }
    };

    fetchTask();
  }, [taskId, fetchExistingSubtasks, fetchExecutions, fetchAuditLogs]);

  // Poll executions while there's an active one
  useEffect(() => {
    const hasActive = executions.some(
      (e) => e.status === 'RUNNING' || e.status === 'QUEUED'
    );

    if (!hasActive) {
      if (executionPollRef.current) {
        clearInterval(executionPollRef.current);
        executionPollRef.current = null;
      }
      return;
    }

    executionPollRef.current = setInterval(() => {
      fetchExecutions();
    }, 3000);

    return () => {
      if (executionPollRef.current) clearInterval(executionPollRef.current);
    };
  }, [executions, fetchExecutions]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const previousStatus = task?.status ?? '';
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const data = await response.json();
        notifyError('Erro ao atualizar status', data.error);
        throw new Error(data.error || 'Erro ao atualizar status');
      }

      const data = await response.json();
      if (data.success) {
        setTask(data.data);
        if (newStatus === 'DONE') {
          notifyTaskCompleted(task?.title ?? 'Tarefa');
        } else {
          notifyStatusChanged(task?.title ?? 'Tarefa', previousStatus, newStatus);
        }
      }
    } catch (err) {
      console.error('Error updating status:', err);
      throw err;
    }
  };

  const handleAssignAgent = async (taskId: string, agentId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId }),
      });

      if (!response.ok) {
        const data = await response.json();
        notifyError('Erro ao atribuir agente', data.error);
        throw new Error(data.error || 'Erro ao atribuir agente');
      }

      const data = await response.json();
      if (data.success) {
        setTask(data.data);
        const agentName = data.data.agentName || data.data.agent?.name || 'Agente';
        notifyTaskAssigned(task?.title ?? 'Tarefa', agentName);
        return data.data;
      }
    } catch (err) {
      console.error('Error assigning agent:', err);
      throw err;
    }
  };

  const handleRemoveAgent = async (taskId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/assign`, { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao remover agente');
      }
      const data = await response.json();
      if (data.success) {
        setTask(data.data);
      }
    } catch (err) {
      console.error('Error removing agent:', err);
      throw err;
    }
  };

  const handleAnalyzeTask = async () => {
    if (!task) return;
    setAnalyzingTask(true);
    try {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: task.title,
          description: task.description || undefined,
        }),
      });
      if (!response.ok) throw new Error('Erro ao analisar tarefa');
      const result = await response.json();
      if (result.success && result.data) {
        setAnalysis(result.data);
        notifyAIAnalysis(result.data.suggestedAgent);
      }
    } catch (err) {
      console.error('Error analyzing task:', err);
      notifyError('Erro ao analisar tarefa', 'Tente novamente.');
    } finally {
      setAnalyzingTask(false);
    }
  };

  const handleApplySuggestion = async (field: string, value: any) => {
    if (!task) return;

    if (field === 'agent') {
      const agentMap: Record<string, string> = {
        MAESTRO: 'maestro-id',
        SENTINEL: 'sentinel-id',
        ARCHITECTON: 'architecton-id',
        PIXEL: 'pixel-id',
      };
      const agentId = agentMap[value];
      if (agentId && agentId !== task.agentId) {
        try {
          await handleAssignAgent(task.id, agentId);
          alert(`Agente ${value} aplicado com sucesso!`);
        } catch {
          alert('Erro ao aplicar agente sugerido.');
        }
      } else if (agentId === task.agentId) {
        alert('Este agente já está atribuído a esta tarefa.');
      }
    }
    if (field === 'estimatedHours') {
      alert(`Horas estimadas sugeridas: ${value}h\n\nAdicione campo de edição se necessário.`);
    }
    if (field === 'tags') {
      alert(`Tags sugeridas: ${value.join(', ')}\n\nAdicione campo de tags se necessário.`);
    }
  };

  const handleSuggestSubtasks = async () => {
    if (!task) return;
    setLoadingSubtasks(true);
    try {
      const response = await fetch('/api/ai/subtasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: task.title,
          description: task.description || undefined,
          maxSubtasks: 5,
        }),
      });
      if (!response.ok) throw new Error('Erro ao sugerir subtarefas');
      const result = await response.json();
      if (result.success && result.data) {
        setSubtaskSuggestions(result.data);
      }
    } catch (err) {
      console.error('Error suggesting subtasks:', err);
      alert('Erro ao sugerir subtarefas. Tente novamente.');
    } finally {
      setLoadingSubtasks(false);
    }
  };

  const handleCreateSubtask = async (subtask: SubtaskSuggestion) => {
    if (!task) return;
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: subtask.title,
          description: subtask.description,
          priority: subtask.priority,
          estimatedHours: subtask.estimatedHours,
          status: 'TODO',
          parentId: task.id,
        }),
      });
      if (!response.ok) throw new Error('Erro ao criar subtarefa');
      const result = await response.json();
      if (result.success) {
        setSubtaskSuggestions((prev) => prev?.filter((s) => s !== subtask) ?? null);
        setExistingSubtasks((prev) => [...prev, result.data]);
        alert(`Subtarefa "${subtask.title}" criada com sucesso!`);
      }
    } catch (err) {
      console.error('Error creating subtask:', err);
      alert('Erro ao criar subtarefa. Tente novamente.');
    }
  };

  const handleCreateAllSubtasks = async (subtasks: SubtaskSuggestion[]) => {
    if (!task) return;
    try {
      const responses = await Promise.all(
        subtasks.map((subtask) =>
          fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: subtask.title,
              description: subtask.description,
              priority: subtask.priority,
              estimatedHours: subtask.estimatedHours,
              status: 'TODO',
              parentId: task.id,
            }),
          })
        )
      );
      const results = await Promise.all(responses.map((r) => r.json()));
      const createdSubtasks = results.filter((r) => r.success).map((r) => r.data);
      setSubtaskSuggestions([]);
      setExistingSubtasks((prev) => [...prev, ...createdSubtasks]);
      alert(`${createdSubtasks.length} subtarefas criadas com sucesso!`);
    } catch (err) {
      console.error('Error creating all subtasks:', err);
      alert('Erro ao criar subtarefas. Tente novamente.');
    }
  };

  // ============================================================================
  // EXECUTION HANDLERS
  // ============================================================================

  const handleExecuteTask = async () => {
    if (!task || !task.agentId) return;
    setExecutingTask(true);
    try {
      notifyInfo('Execução iniciada', `Executando "${task.title}"...`);
      const response = await fetch('/api/executions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: task.id, agentId: task.agentId }),
      });
      if (!response.ok) {
        const data = await response.json();
        notifyError('Erro ao executar', data.error);
        return;
      }
      const data = await response.json();
      if (data.success) {
        notifySuccess('Execução concluída', `"${task.title}" finalizada.`);
        await fetchExecutions();
        // Reload task to get updated status
        const taskRes = await fetch(`/api/tasks/${taskId}`);
        if (taskRes.ok) {
          const taskData = await taskRes.json();
          if (taskData.success) setTask(taskData.data);
        }
      }
    } catch (err) {
      console.error('Error executing task:', err);
      notifyError('Erro na execução', 'Ocorreu um erro inesperado.');
    } finally {
      setExecutingTask(false);
    }
  };

  const handleAutoAssignAndExecute = async () => {
    if (!task) return;
    setAutoAssigning(true);
    try {
      // Fetch available agents
      const agentsRes = await fetch('/api/agents?active=true');
      if (!agentsRes.ok) {
        notifyError('Erro', 'Não foi possível buscar agentes disponíveis.');
        return;
      }
      const agentsData = await agentsRes.json();
      if (!agentsData.success || !agentsData.data?.length) {
        notifyError('Erro', 'Nenhum agente disponível.');
        return;
      }

      // Pick first active agent (MAESTRO preferred)
      const agents: Agent[] = agentsData.data;
      const maestro = agents.find((a) => a.role === 'MAESTRO');
      const agent = maestro ?? agents[0];

      // Assign agent
      const updatedTask = await handleAssignAgent(task.id, agent.id);
      if (!updatedTask) return;

      // Execute with newly assigned agent
      notifyInfo('Execução iniciada', `Executando com ${agent.name}...`);
      const response = await fetch('/api/executions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: task.id, agentId: agent.id }),
      });
      if (!response.ok) {
        const data = await response.json();
        notifyError('Erro ao executar', data.error);
        return;
      }
      const data = await response.json();
      if (data.success) {
        notifySuccess('Execução concluída', `"${task.title}" finalizada.`);
        await fetchExecutions();
        const taskRes = await fetch(`/api/tasks/${taskId}`);
        if (taskRes.ok) {
          const taskData = await taskRes.json();
          if (taskData.success) setTask(taskData.data);
        }
      }
    } catch (err) {
      console.error('Error auto-assign and execute:', err);
      notifyError('Erro', 'Ocorreu um erro inesperado.');
    } finally {
      setAutoAssigning(false);
    }
  };

  const handlePauseExecution = async (executionId: string) => {
    try {
      const response = await fetch(`/api/executions/${executionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pause' }),
      });
      if (response.ok) {
        notifyInfo('Execução pausada');
        await fetchExecutions();
      }
    } catch (err) {
      console.error('Error pausing execution:', err);
    }
  };

  const handleResumeExecution = async (executionId: string) => {
    try {
      const response = await fetch(`/api/executions/${executionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resume' }),
      });
      if (response.ok) {
        notifyInfo('Execução retomada');
        await fetchExecutions();
      }
    } catch (err) {
      console.error('Error resuming execution:', err);
    }
  };

  const handleCancelExecution = async (executionId: string) => {
    try {
      const response = await fetch(`/api/executions/${executionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      });
      if (response.ok) {
        notifyInfo('Execução cancelada');
        await fetchExecutions();
      }
    } catch (err) {
      console.error('Error cancelling execution:', err);
    }
  };

  const handleAcceptAndAdvance = async () => {
    if (!task) return;
    const nextStatus = NEXT_STATUS_MAP[task.status];
    if (nextStatus) {
      await handleStatusChange(task.id, nextStatus);
    }
  };

  const handleRejectAndRetry = async () => {
    if (!task || !task.agentId) return;
    notifyInfo('Reexecutando tarefa...');
    await handleExecuteTask();
  };

  // ============================================================================
  // FEEDBACK HANDLERS
  // ============================================================================

  const IMPROVEMENT_OPTIONS = [
    'Mais detalhes',
    'Mais conciso',
    'Melhor estrutura',
    'Exemplos práticos',
    'Considerar edge cases',
    'Melhor formatação',
  ];

  const openFeedbackModal = (executionId: string) => {
    setFeedbackExecutionId(executionId);
    setFeedbackRating(0);
    setFeedbackHover(0);
    setFeedbackComments('');
    setFeedbackImprovements([]);
    setFeedbackModalOpen(true);
  };

  const toggleImprovement = (improvement: string) => {
    setFeedbackImprovements((prev) =>
      prev.includes(improvement)
        ? prev.filter((i) => i !== improvement)
        : [...prev, improvement]
    );
  };

  const handleSubmitFeedback = async (wasAccepted: boolean) => {
    if (!feedbackExecutionId || feedbackRating === 0) return;
    setSubmittingFeedback(true);
    try {
      const response = await fetch(
        `/api/executions/${feedbackExecutionId}/feedback`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rating: feedbackRating,
            wasAccepted,
            comments: feedbackComments || undefined,
            improvements: feedbackImprovements.length > 0 ? feedbackImprovements : undefined,
          }),
        }
      );
      if (!response.ok) {
        const data = await response.json();
        notifyError('Erro ao enviar feedback', data.error);
        return;
      }
      notifySuccess(
        'Feedback registrado',
        wasAccepted ? 'Execução aceita com sucesso.' : 'Feedback de rejeição registrado.'
      );
      setFeedbackModalOpen(false);

      // Se aceito, avançar status
      if (wasAccepted) {
        await handleAcceptAndAdvance();
      }
    } catch (err) {
      console.error('Error submitting feedback:', err);
      notifyError('Erro', 'Não foi possível enviar o feedback.');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  // ============================================================================
  // RENDER: LOADING
  // ============================================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <TaskDetailSkeleton />
        </main>
      </div>
    );
  }

  // ============================================================================
  // RENDER: ERROR (404)
  // ============================================================================

  if (error || !task) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Card className="border-destructive">
              <CardContent className="py-12">
                <div className="text-center space-y-4">
                  <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
                  <h2 className="text-2xl font-bold text-destructive">
                    {error === 'Tarefa não encontrada' ? 'Tarefa não encontrada' : 'Erro'}
                  </h2>
                  <p className="text-muted-foreground">
                    {error || 'Não foi possível carregar a tarefa.'}
                  </p>
                  <Button onClick={() => router.push('/')} className="mt-4">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar para Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  // ============================================================================
  // RENDER: TASK DETAIL
  // ============================================================================

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* ====== HEADER SECTION ====== */}
          <div className="space-y-4">
            {/* Back Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>

            {/* Title and Badges */}
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <h1 className="text-3xl font-bold tracking-tight flex-1">{task.title}</h1>
                {existingSubtasks.length > 0 && (
                  <Badge variant="outline" className="flex items-center gap-1.5 mt-1">
                    <ListTodo className="h-3.5 w-3.5" />
                    {existingSubtasks.length} subtarefa{existingSubtasks.length > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={task.status} />
                <PriorityBadge priority={task.priority} />
                {task.parentId && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" />
                    Subtarefa
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* ====== MAIN CONTENT GRID ====== */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Main Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* ====== INFORMATION CARD ====== */}
              <Card>
                <CardHeader>
                  <CardTitle>Informações da Tarefa</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Description */}
                  {task.description && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-2">
                        Descrição
                      </h3>
                      <p className="text-sm whitespace-pre-wrap">{task.description}</p>
                    </div>
                  )}

                  {/* Dates and Hours */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Created At */}
                    <div className="flex items-start gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Criada em
                        </p>
                        <p className="text-sm">
                          {format(new Date(task.createdAt), "dd 'de' MMMM 'de' yyyy", {
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                    </div>

                    {/* Completed At */}
                    {task.completedAt && (
                      <div className="flex items-start gap-3">
                        <Calendar className={`h-4 w-4 mt-0.5 ${SEMANTIC_COLORS.success}`} />
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            Concluída em
                          </p>
                          <p className="text-sm">
                            {format(
                              new Date(task.completedAt),
                              "dd 'de' MMMM 'de' yyyy",
                              { locale: ptBR }
                            )}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Due Date */}
                    {task.dueDate && (
                      <div className="flex items-start gap-3">
                        <Calendar className={`h-4 w-4 mt-0.5 ${SEMANTIC_COLORS.warning}`} />
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            Prazo
                          </p>
                          <p className="text-sm">
                            {format(new Date(task.dueDate), "dd 'de' MMMM 'de' yyyy", {
                              locale: ptBR,
                            })}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Estimated Hours */}
                    {task.estimatedHours && (
                      <div className="flex items-start gap-3">
                        <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            Horas Estimadas
                          </p>
                          <p className="text-sm">{task.estimatedHours}h</p>
                        </div>
                      </div>
                    )}

                    {/* Actual Hours */}
                    {task.actualHours && (
                      <div className="flex items-start gap-3">
                        <Clock className={`h-4 w-4 mt-0.5 ${SEMANTIC_COLORS.info}`} />
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            Horas Reais
                          </p>
                          <p className="text-sm">{task.actualHours}h</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* ====== EXECUTION SECTION ====== */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="flex items-center gap-2">
                    <Zap className={`h-5 w-5 ${SEMANTIC_COLORS.amber}`} />
                    Execução Automática
                  </CardTitle>
                  {!activeExecution && (
                    task.agentId ? (
                      <Button
                        size="sm"
                        onClick={handleExecuteTask}
                        disabled={executingTask || task.status === 'DONE'}
                      >
                        {executingTask ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4 mr-2" />
                        )}
                        {executingTask ? 'Executando...' : `Executar com ${task.agentName ?? 'Agente'}`}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleAutoAssignAndExecute}
                        disabled={autoAssigning || task.status === 'DONE'}
                      >
                        {autoAssigning ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Bot className="h-4 w-4 mr-2" />
                        )}
                        {autoAssigning ? 'Atribuindo...' : 'Auto-atribuir e Executar'}
                      </Button>
                    )
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Active Execution: Inline Progress */}
                  {activeExecution && (
                    <div className="space-y-4">
                      <ExecutionProgress
                        execution={activeExecution}
                        onPause={() => handlePauseExecution(activeExecution.id)}
                        onResume={() => handleResumeExecution(activeExecution.id)}
                        onCancel={() => handleCancelExecution(activeExecution.id)}
                      />
                      {/* Inline Logs (last 5) */}
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">
                          Logs Recentes
                        </h4>
                        <ExecutionLogs executionId={activeExecution.id} autoScroll />
                      </div>
                    </div>
                  )}

                  {/* Completed Execution Result */}
                  {!activeExecution && latestExecution?.status === 'COMPLETED' && latestExecution.result && (
                    <div className="space-y-4">
                      <div className={`flex items-center gap-2 ${SEMANTIC_COLORS.success}`}>
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="font-medium text-sm">Execução concluída com sucesso</span>
                      </div>
                      <div className={`rounded-lg p-4 ${EXECUTION_COLORS.COMPLETED.result}`}>
                        <p className="text-sm whitespace-pre-wrap">{latestExecution.result}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => openFeedbackModal(latestExecution.id)}
                        >
                          <Star className="h-4 w-4 mr-2" />
                          Avaliar Execução
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleRejectAndRetry}
                          disabled={executingTask}
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Refazer sem Feedback
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Failed Execution */}
                  {!activeExecution && latestExecution?.status === 'FAILED' && (
                    <div className="space-y-4">
                      <div className={`flex items-center gap-2 ${SEMANTIC_COLORS.error}`}>
                        <XCircle className="h-5 w-5" />
                        <span className="font-medium text-sm">Execução falhou</span>
                      </div>
                      {latestExecution.error && (
                        <div className={`rounded-lg p-4 ${EXECUTION_COLORS.FAILED.error}`}>
                          <p className={`text-sm font-mono break-all ${EXECUTION_COLORS.FAILED.errorText}`}>
                            {latestExecution.error}
                          </p>
                        </div>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleRejectAndRetry}
                        disabled={executingTask}
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Tentar Novamente
                      </Button>
                    </div>
                  )}

                  {/* No Executions Empty State */}
                  {!activeExecution && !latestExecution && !loadingExecutions && (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                      Nenhuma execução realizada ainda.
                      <br />
                      {task.agentId
                        ? 'Clique em "Executar" para iniciar.'
                        : 'Atribua um agente ou clique em "Auto-atribuir e Executar".'}
                    </div>
                  )}

                  {loadingExecutions && !executions.length && (
                    <div className="py-4 text-center">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                    </div>
                  )}

                  {/* Past Executions List */}
                  {pastExecutions.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="text-sm font-medium mb-3">
                          Execuções Anteriores ({pastExecutions.length})
                        </h4>
                        <div className="space-y-2">
                          {pastExecutions.map((exec) => {
                            const isExpanded = expandedExecution === exec.id;
                            const statusColor =
                              EXECUTION_COLORS[exec.status as keyof typeof EXECUTION_COLORS]?.badge
                              ?? 'text-muted-foreground bg-muted border-border';
                            const statusLabel =
                              exec.status === 'COMPLETED'
                                ? 'Concluído'
                                : exec.status === 'FAILED'
                                  ? 'Falhou'
                                  : 'Cancelado';

                            return (
                              <div key={exec.id} className="border rounded-lg overflow-hidden">
                                <button
                                  onClick={() =>
                                    setExpandedExecution(isExpanded ? null : exec.id)
                                  }
                                  className="w-full flex items-center justify-between p-3 hover:bg-accent/5 transition-colors text-left"
                                >
                                  <div className="flex items-center gap-3">
                                    {isExpanded ? (
                                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    )}
                                    <Badge
                                      variant="outline"
                                      className={`text-xs border ${statusColor}`}
                                    >
                                      {statusLabel}
                                    </Badge>
                                    {exec.agent && (
                                      <span className="text-xs text-muted-foreground">
                                        {exec.agent.name}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3">
                                    {exec.startedAt && (
                                      <span className="text-xs text-muted-foreground">
                                        {format(
                                          new Date(exec.startedAt),
                                          "dd/MM/yy HH:mm",
                                          { locale: ptBR }
                                        )}
                                      </span>
                                    )}
                                    {exec.status === 'COMPLETED' && (
                                      <button
                                        className={`text-xs hover:underline ${SEMANTIC_COLORS.ai}`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openFeedbackModal(exec.id);
                                        }}
                                      >
                                        Avaliar
                                      </button>
                                    )}
                                    <Link
                                      href={`/executions/${exec.id}`}
                                      className="text-xs text-primary hover:underline"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      Detalhes
                                    </Link>
                                  </div>
                                </button>
                                {isExpanded && (
                                  <div className="border-t px-4 py-3 bg-muted/5 space-y-2">
                                    <div className="text-xs text-muted-foreground">
                                      Progresso: {exec.progress}%
                                    </div>
                                    {exec.result && (
                                      <div className="text-sm whitespace-pre-wrap bg-card rounded p-2 border max-h-40 overflow-y-auto">
                                        {exec.result}
                                      </div>
                                    )}
                                    {exec.error && (
                                      <div className={`text-sm font-mono rounded p-2 break-all ${EXECUTION_COLORS.FAILED.errorText} ${EXECUTION_COLORS.FAILED.error}`}>
                                        {exec.error}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* ====== ACTIONS CARD ====== */}
              <Card>
                <CardHeader>
                  <CardTitle>Ações da Tarefa</CardTitle>
                </CardHeader>
                <CardContent>
                  <TaskActions
                    taskId={task.id}
                    currentStatus={task.status}
                    onAction={handleStatusChange}
                  />
                </CardContent>
              </Card>

              {/* ====== AI ANALYSIS SECTION ====== */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className={`h-5 w-5 ${SEMANTIC_COLORS.ai}`} />
                    Análise IA
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAnalyzeTask}
                    disabled={analyzingTask}
                  >
                    <Bot className="h-4 w-4 mr-2" />
                    {analyzingTask ? 'Analisando...' : 'Analisar Tarefa'}
                  </Button>
                </CardHeader>
                <CardContent>
                  {!analysis && !analyzingTask && (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      Clique em "Analisar Tarefa" para obter sugestões da IA
                    </div>
                  )}
                  {(analysis || analyzingTask) && (
                    <TaskAnalysisCard
                      analysis={analysis}
                      loading={analyzingTask}
                      onApplySuggestion={handleApplySuggestion}
                    />
                  )}
                </CardContent>
              </Card>

              {/* ====== SUBTASKS SECTION ====== */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="flex items-center gap-2">
                    <ListTodo className={`h-5 w-5 ${SEMANTIC_COLORS.info}`} />
                    Subtarefas
                    {existingSubtasks.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {existingSubtasks.length}
                      </Badge>
                    )}
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSuggestSubtasks}
                    disabled={loadingSubtasks}
                  >
                    <Bot className="h-4 w-4 mr-2" />
                    {loadingSubtasks ? 'Sugerindo...' : 'Sugerir com IA'}
                  </Button>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* AI Suggestions */}
                  {(subtaskSuggestions !== null || loadingSubtasks) && (
                    <div>
                      <h3 className="text-sm font-medium mb-3">Sugestões da IA</h3>
                      <SubtaskSuggestions
                        suggestions={subtaskSuggestions}
                        loading={loadingSubtasks}
                        onCreateSubtask={handleCreateSubtask}
                        onCreateAll={handleCreateAllSubtasks}
                      />
                    </div>
                  )}

                  {(subtaskSuggestions !== null || loadingSubtasks) && <Separator />}

                  {/* Subtask List with checkboxes, inline add, progress */}
                  <SubtaskList
                    taskId={task.id}
                    onSubtasksChange={(subs) => setExistingSubtasks(subs as Subtask[])}
                  />
                </CardContent>
              </Card>

              {/* ====== HISTORY CARD ====== */}
              {task.statusHistory && task.statusHistory.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Histórico de Mudanças</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Timeline items={task.statusHistory} />
                  </CardContent>
                </Card>
              )}

              {/* ====== ATTACHMENTS SECTION ====== */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Paperclip className={`h-5 w-5 ${SEMANTIC_COLORS.amber}`} />
                    Anexos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <AttachmentList taskId={task.id} />
                </CardContent>
              </Card>

              {/* ====== COMMENTS SECTION ====== */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className={`h-5 w-5 ${SEMANTIC_COLORS.info}`} />
                    Comentários
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CommentList taskId={task.id} />
                </CardContent>
              </Card>

              {/* ====== AUDIT HISTORY SECTION ====== */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-muted-foreground" />
                    Historico de Auditoria
                    {auditEntries.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {auditEntries.length}
                      </Badge>
                    )}
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setAuditExpanded(!auditExpanded)}
                    className="text-xs text-muted-foreground"
                  >
                    {auditExpanded ? 'Recolher' : 'Expandir'}
                  </Button>
                </CardHeader>
                {auditExpanded && (
                  <CardContent>
                    <AuditTimeline entries={auditEntries} showEntity={false} />
                  </CardContent>
                )}
              </Card>
            </div>

            {/* Right Column: Agent & Metadata */}
            <div className="space-y-6">
              {/* ====== AGENT CARD ====== */}
              <Card>
                <CardHeader>
                  <CardTitle>Agente Responsável</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <AgentSelector
                    taskId={task.id}
                    currentAgentId={task.agentId || null}
                    onAssign={handleAssignAgent}
                    onRemove={handleRemoveAgent}
                  />

                  {task.agentName && (
                    <div className="pt-4 border-t">
                      <p className="text-sm text-muted-foreground mb-1">
                        Agente Atual:
                      </p>
                      <p className="text-sm font-medium">{task.agentName}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* ====== METADATA CARD ====== */}
              <Card>
                <CardHeader>
                  <CardTitle>Metadados</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">ID da Tarefa</p>
                    <p className="text-sm font-mono">{task.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Última Atualização
                    </p>
                    <p className="text-sm">
                      {format(new Date(task.updatedAt), "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* ====== FEEDBACK MODAL ====== */}
      <Dialog open={feedbackModalOpen} onOpenChange={setFeedbackModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className={`h-5 w-5 ${SEMANTIC_COLORS.ai}`} />
              Avaliar Execução
            </DialogTitle>
            <DialogDescription>
              Avalie a qualidade da execução para melhorar futuras análises do agente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Star Rating */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Qualidade da Resposta
              </label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFeedbackRating(star)}
                    onMouseEnter={() => setFeedbackHover(star)}
                    onMouseLeave={() => setFeedbackHover(0)}
                    className="p-0.5 transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-7 w-7 ${
                        star <= (feedbackHover || feedbackRating)
                          ? SEMANTIC_COLORS.star
                          : 'text-muted-foreground'
                      } transition-colors`}
                    />
                  </button>
                ))}
                {feedbackRating > 0 && (
                  <span className="ml-2 text-sm text-muted-foreground self-center">
                    {feedbackRating}/5
                  </span>
                )}
              </div>
            </div>

            {/* Improvement Tags */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Sugestões de Melhoria
              </label>
              <div className="flex flex-wrap gap-1.5">
                {IMPROVEMENT_OPTIONS.map((imp) => {
                  const selected = feedbackImprovements.includes(imp);
                  return (
                    <Badge
                      key={imp}
                      variant={selected ? 'default' : 'outline'}
                      className={`cursor-pointer transition-colors ${
                        selected
                          ? SELECTED_BADGE
                          : 'hover:bg-accent'
                      }`}
                      onClick={() => toggleImprovement(imp)}
                    >
                      {imp}
                    </Badge>
                  );
                })}
              </div>
            </div>

            {/* Comments */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Comentários (opcional)
              </label>
              <Textarea
                value={feedbackComments}
                onChange={(e) => setFeedbackComments(e.target.value)}
                placeholder="O que poderia ser melhorado nesta execução?"
                rows={3}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={feedbackRating === 0 || submittingFeedback}
              onClick={() => handleSubmitFeedback(false)}
              className={SEMANTIC_COLORS.destructiveButton}
            >
              {submittingFeedback ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              Rejeitar
            </Button>
            <Button
              size="sm"
              disabled={feedbackRating === 0 || submittingFeedback}
              onClick={() => handleSubmitFeedback(true)}
            >
              {submittingFeedback ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Aceitar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
