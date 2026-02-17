'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  getNextActions,
  getStatusInfo,
  type TaskStatus,
  type NextAction,
} from '@/lib/workflow/state-machine';
import { cn } from '@/lib/utils';
import { CheckCircle2, Loader2, Lock, Unlock } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface TaskActionsProps {
  taskId: string;
  currentStatus: TaskStatus;
  onAction: (taskId: string, newStatus: string) => Promise<void>;
  disabled?: boolean;
  className?: string;
}

// ============================================================================
// TASK ACTIONS COMPONENT
// ============================================================================

export function TaskActions({
  taskId,
  currentStatus,
  onAction,
  disabled = false,
  className,
}: TaskActionsProps) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get available actions from state machine
  const availableActions = getNextActions(currentStatus);

  // Handle action execution
  const handleAction = async (action: NextAction) => {
    try {
      setError(null);
      setLoadingAction(action.action);

      await onAction(taskId, action.targetStatus);
    } catch (err) {
      console.error('Error executing action:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Erro ao executar ação. Tente novamente.'
      );
    } finally {
      setLoadingAction(null);
    }
  };

  // ============================================================================
  // RENDER: DONE STATUS (Final State)
  // ============================================================================

  if (currentStatus === 'DONE') {
    const statusInfo = getStatusInfo('DONE');

    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Badge
          variant="outline"
          className={cn(
            'px-3 py-1.5 text-sm font-medium',
            statusInfo.color
          )}
        >
          <CheckCircle2 className="mr-2 h-4 w-4" />
          {statusInfo.icon} {statusInfo.label}
        </Badge>
      </div>
    );
  }

  // ============================================================================
  // RENDER: BLOCKED STATUS (Special Handling)
  // ============================================================================

  if (currentStatus === 'BLOCKED') {
    return (
      <div className={cn('space-y-3', className)}>
        {/* Blocked Indicator */}
        <div className="flex items-center gap-2">
          <Badge variant="destructive" className="px-3 py-1.5 text-sm">
            <Lock className="mr-2 h-4 w-4" />
            ⬢ Bloqueado
          </Badge>
        </div>

        {/* Unblock Actions */}
        <div className="flex flex-wrap gap-2">
          {availableActions.map((action) => {
            const isLoading = loadingAction === action.action;
            const isDisabled = disabled || loadingAction !== null;

            return (
              <Button
                key={action.action}
                variant={action.variant}
                size="sm"
                onClick={() => handleAction(action)}
                disabled={isDisabled}
                className="gap-2"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Unlock className="h-4 w-4" />
                )}
                {action.label}
              </Button>
            );
          })}
        </div>

        {/* Error Message */}
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>
    );
  }

  // ============================================================================
  // RENDER: REGULAR ACTIONS
  // ============================================================================

  if (availableActions.length === 0) {
    return (
      <div className={cn('text-sm text-muted-foreground', className)}>
        Nenhuma ação disponível
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        {availableActions.map((action) => {
          const isLoading = loadingAction === action.action;
          const isDisabled = disabled || loadingAction !== null;

          return (
            <Button
              key={action.action}
              variant={action.variant}
              size="default"
              onClick={() => handleAction(action)}
              disabled={isDisabled}
              className="gap-2"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {action.label}
            </Button>
          );
        })}
      </div>

      {/* Error Message */}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}

// ============================================================================
// COMPACT TASK ACTIONS (Alternative Variant)
// ============================================================================

export interface TaskActionsCompactProps {
  taskId: string;
  currentStatus: TaskStatus;
  onAction: (taskId: string, newStatus: string) => Promise<void>;
  disabled?: boolean;
  className?: string;
}

/**
 * Compact version of TaskActions for use in tables or cards
 */
export function TaskActionsCompact({
  taskId,
  currentStatus,
  onAction,
  disabled = false,
  className,
}: TaskActionsCompactProps) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const availableActions = getNextActions(currentStatus);

  const handleAction = async (action: NextAction) => {
    try {
      setLoadingAction(action.action);
      await onAction(taskId, action.targetStatus);
    } catch (err) {
      console.error('Error executing action:', err);
    } finally {
      setLoadingAction(null);
    }
  };

  // Done state
  if (currentStatus === 'DONE') {
    return (
      <Badge variant="outline" className="text-xs">
        <CheckCircle2 className="mr-1 h-3 w-3" />
        Concluído
      </Badge>
    );
  }

  // No actions available
  if (availableActions.length === 0) {
    return null;
  }

  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {availableActions.map((action) => {
        const isLoading = loadingAction === action.action;
        const isDisabled = disabled || loadingAction !== null;

        return (
          <Button
            key={action.action}
            variant={action.variant}
            size="xs"
            onClick={() => handleAction(action)}
            disabled={isDisabled}
          >
            {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
            {action.label}
          </Button>
        );
      })}
    </div>
  );
}

// ============================================================================
// DROPDOWN TASK ACTIONS (Alternative Variant)
// ============================================================================

export interface TaskActionsDropdownProps {
  taskId: string;
  currentStatus: TaskStatus;
  onAction: (taskId: string, newStatus: string) => Promise<void>;
  disabled?: boolean;
}

/**
 * Dropdown version of TaskActions for use in compact spaces
 * Requires DropdownMenu component from shadcn/ui
 */
export function TaskActionsDropdown({
  taskId,
  currentStatus,
  onAction,
  disabled = false,
}: TaskActionsDropdownProps) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const availableActions = getNextActions(currentStatus);

  const handleAction = async (action: NextAction) => {
    try {
      setLoadingAction(action.action);
      await onAction(taskId, action.targetStatus);
      setOpen(false);
    } catch (err) {
      console.error('Error executing action:', err);
    } finally {
      setLoadingAction(null);
    }
  };

  // Done state - no dropdown
  if (currentStatus === 'DONE') {
    return (
      <Badge variant="outline" className="text-xs">
        <CheckCircle2 className="mr-1 h-3 w-3" />
        Concluído
      </Badge>
    );
  }

  // No actions - no dropdown
  if (availableActions.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(!open)}
        disabled={disabled || loadingAction !== null}
      >
        {loadingAction ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Processando...
          </>
        ) : (
          'Ações'
        )}
      </Button>

      {open && !loadingAction && (
        <div className="absolute right-0 mt-2 w-48 rounded-md border bg-popover p-1 shadow-md z-50">
          {availableActions.map((action) => (
            <button
              key={action.action}
              onClick={() => handleAction(action)}
              className={cn(
                'w-full px-3 py-2 text-left text-sm rounded-sm',
                'hover:bg-accent hover:text-accent-foreground',
                'transition-colors'
              )}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default TaskActions;
