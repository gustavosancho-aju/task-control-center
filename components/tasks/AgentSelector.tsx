'use client';

import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
} from '@/components/ui/select';
import { Loader2, User, UserX } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export type AgentRole = 'MAESTRO' | 'SENTINEL' | 'ARCHITECTON' | 'PIXEL';

export interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  description?: string | null;
  isActive: boolean;
  skills: string[];
}

export interface AgentSelectorProps {
  taskId: string;
  currentAgentId: string | null;
  onAssign: (taskId: string, agentId: string) => Promise<void>;
  onRemove: (taskId: string) => Promise<void>;
  disabled?: boolean;
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const AGENT_ROLE_EMOJIS: Record<AgentRole, string> = {
  MAESTRO: '🎯',
  SENTINEL: '🛡️',
  ARCHITECTON: '🏗️',
  PIXEL: '🎨',
};

const AGENT_ROLE_LABELS: Record<AgentRole, string> = {
  MAESTRO: 'Orquestrador',
  SENTINEL: 'Revisor/Qualidade',
  ARCHITECTON: 'Arquiteto',
  PIXEL: 'Designer',
};

const NO_AGENT_VALUE = '__none__';

// ============================================================================
// AGENT SELECTOR COMPONENT
// ============================================================================

export function AgentSelector({
  taskId,
  currentAgentId,
  onAssign,
  onRemove,
  disabled = false,
  className,
}: AgentSelectorProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch agents on mount
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/agents?active=true');

        if (!response.ok) {
          throw new Error('Erro ao buscar agentes');
        }

        const data = await response.json();

        if (data.success) {
          setAgents(data.data);
        } else {
          throw new Error(data.error || 'Erro ao buscar agentes');
        }
      } catch (err) {
        console.error('Error fetching agents:', err);
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    fetchAgents();
  }, []);

  // Handle agent selection
  const handleValueChange = async (value: string) => {
    try {
      setAssigning(true);
      setError(null);

      if (value === NO_AGENT_VALUE) {
        // Remove agent assignment
        await onRemove(taskId);
      } else {
        // Assign agent
        await onAssign(taskId, value);
      }
    } catch (err) {
      console.error('Error changing agent assignment:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Erro ao atualizar atribuição de agente'
      );
    } finally {
      setAssigning(false);
    }
  };

  // Get current value for Select
  const currentValue = currentAgentId || NO_AGENT_VALUE;

  // Get display text for selected agent
  const getDisplayText = () => {
    if (assigning) {
      return 'Atribuindo...';
    }

    if (!currentAgentId) {
      return 'Sem agente';
    }

    const agent = agents.find((a) => a.id === currentAgentId);
    if (!agent) {
      return 'Sem agente';
    }

    return (
      <span className="flex items-center gap-2">
        <span>{AGENT_ROLE_EMOJIS[agent.role]}</span>
        <span>{agent.name}</span>
      </span>
    );
  };

  // ============================================================================
  // RENDER: LOADING STATE
  // ============================================================================

  if (loading) {
    return (
      <div className={cn('flex items-center gap-2 text-sm', className)}>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-muted-foreground">Carregando agentes...</span>
      </div>
    );
  }

  // ============================================================================
  // RENDER: ERROR STATE
  // ============================================================================

  if (error && agents.length === 0) {
    return (
      <div className={cn('text-sm text-destructive', className)}>
        {error}
      </div>
    );
  }

  // ============================================================================
  // RENDER: SELECT
  // ============================================================================

  return (
    <div className={cn('space-y-2', className)}>
      <Select
        value={currentValue}
        onValueChange={handleValueChange}
        disabled={disabled || assigning}
      >
        <SelectTrigger className="w-full">
          {assigning ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Atribuindo...</span>
            </div>
          ) : (
            <SelectValue>{getDisplayText()}</SelectValue>
          )}
        </SelectTrigger>

        <SelectContent>
          {/* No Agent Option */}
          <SelectItem value={NO_AGENT_VALUE}>
            <span className="flex items-center gap-2">
              <UserX className="h-4 w-4 text-muted-foreground" />
              <span>Sem agente</span>
            </span>
          </SelectItem>

          {agents.length > 0 && <SelectSeparator />}

          {/* Agents List */}
          {agents.map((agent) => (
            <SelectItem key={agent.id} value={agent.id}>
              <span className="flex items-center gap-2">
                <span className="text-base">{AGENT_ROLE_EMOJIS[agent.role]}</span>
                <span className="flex flex-col items-start gap-0.5">
                  <span className="font-medium">{agent.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {AGENT_ROLE_LABELS[agent.role]}
                  </span>
                </span>
              </span>
            </SelectItem>
          ))}

          {/* No agents available */}
          {agents.length === 0 && (
            <div className="px-2 py-6 text-center text-sm text-muted-foreground">
              Nenhum agente disponível
            </div>
          )}
        </SelectContent>
      </Select>

      {/* Error Message */}
      {error && agents.length > 0 && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}

// ============================================================================
// COMPACT AGENT SELECTOR (Alternative Variant)
// ============================================================================

export interface AgentSelectorCompactProps {
  taskId: string;
  currentAgentId: string | null;
  onAssign: (taskId: string, agentId: string) => Promise<void>;
  onRemove: (taskId: string) => Promise<void>;
  disabled?: boolean;
}

/**
 * Compact version for use in tables or lists
 */
export function AgentSelectorCompact({
  taskId,
  currentAgentId,
  onAssign,
  onRemove,
  disabled = false,
}: AgentSelectorCompactProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const response = await fetch('/api/agents?active=true');
        const data = await response.json();
        if (data.success) {
          setAgents(data.data);
        }
      } catch (err) {
        console.error('Error fetching agents:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAgents();
  }, []);

  const handleValueChange = async (value: string) => {
    try {
      setAssigning(true);
      if (value === NO_AGENT_VALUE) {
        await onRemove(taskId);
      } else {
        await onAssign(taskId, value);
      }
    } catch (err) {
      console.error('Error changing agent assignment:', err);
    } finally {
      setAssigning(false);
    }
  };

  if (loading) {
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  }

  const currentAgent = agents.find((a) => a.id === currentAgentId);

  return (
    <Select
      value={currentAgentId || NO_AGENT_VALUE}
      onValueChange={handleValueChange}
      disabled={disabled || assigning}
    >
      <SelectTrigger size="sm" className="h-8 w-auto min-w-[120px]">
        {assigning ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : currentAgent ? (
          <span className="flex items-center gap-1.5">
            <span className="text-sm">{AGENT_ROLE_EMOJIS[currentAgent.role]}</span>
            <span className="text-xs">{currentAgent.name}</span>
          </span>
        ) : (
          <span className="flex items-center gap-1.5">
            <UserX className="h-3 w-3" />
            <span className="text-xs">Sem agente</span>
          </span>
        )}
      </SelectTrigger>

      <SelectContent>
        <SelectItem value={NO_AGENT_VALUE}>
          <UserX className="h-3 w-3 mr-1" />
          Sem agente
        </SelectItem>

        {agents.length > 0 && <SelectSeparator />}

        {agents.map((agent) => (
          <SelectItem key={agent.id} value={agent.id}>
            <span className="flex items-center gap-1.5">
              <span>{AGENT_ROLE_EMOJIS[agent.role]}</span>
              <span>{agent.name}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ============================================================================
// AGENT BADGE (Display Only)
// ============================================================================

export interface AgentBadgeProps {
  agentId: string | null;
  className?: string;
}

/**
 * Display-only badge showing assigned agent
 */
export function AgentBadge({ agentId, className }: AgentBadgeProps) {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agentId) {
      setLoading(false);
      return;
    }

    const fetchAgent = async () => {
      try {
        const response = await fetch('/api/agents');
        const data = await response.json();
        if (data.success) {
          const foundAgent = data.data.find((a: Agent) => a.id === agentId);
          setAgent(foundAgent || null);
        }
      } catch (err) {
        console.error('Error fetching agent:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAgent();
  }, [agentId]);

  if (loading) {
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  }

  if (!agent) {
    return (
      <span className={cn('flex items-center gap-1.5 text-xs text-muted-foreground', className)}>
        <UserX className="h-3 w-3" />
        Sem agente
      </span>
    );
  }

  return (
    <span className={cn('flex items-center gap-1.5 text-sm', className)}>
      <span>{AGENT_ROLE_EMOJIS[agent.role]}</span>
      <span className="font-medium">{agent.name}</span>
      <span className="text-xs text-muted-foreground">
        ({AGENT_ROLE_LABELS[agent.role]})
      </span>
    </span>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default AgentSelector;
