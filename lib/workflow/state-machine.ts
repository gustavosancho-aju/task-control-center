/**
 * State Machine for Task Status Workflow
 * Manages valid transitions and provides utilities for status handling
 */

// ============================================================================
// TYPES
// ============================================================================

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE' | 'BLOCKED';

export type ActionVariant = 'default' | 'secondary' | 'destructive';

export interface NextAction {
  action: string;
  targetStatus: TaskStatus;
  label: string;
  variant: ActionVariant;
}

export interface StatusInfo {
  label: string;
  color: string;
  icon: string;
}

// ============================================================================
// VALID TRANSITIONS
// ============================================================================

/**
 * Defines all valid status transitions in the workflow
 * Key: current status, Value: array of allowed next statuses
 */
export const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  TODO: ['IN_PROGRESS', 'BLOCKED'],
  IN_PROGRESS: ['REVIEW', 'BLOCKED', 'TODO'],
  REVIEW: ['DONE', 'IN_PROGRESS', 'BLOCKED'],
  DONE: [], // Final state - no transitions allowed
  BLOCKED: ['TODO', 'IN_PROGRESS'],
};

// ============================================================================
// TRANSITION VALIDATION
// ============================================================================

/**
 * Checks if a status transition is valid
 * @param from - Current status
 * @param to - Target status
 * @returns true if transition is allowed, false otherwise
 */
export function isValidTransition(from: TaskStatus, to: TaskStatus): boolean {
  const allowedTransitions = VALID_TRANSITIONS[from];
  return allowedTransitions.includes(to);
}

// ============================================================================
// NEXT ACTIONS
// ============================================================================

/**
 * Gets all possible actions from a given status
 * @param status - Current task status
 * @returns Array of possible actions with labels and styling
 */
export function getNextActions(status: TaskStatus): NextAction[] {
  const transitions = VALID_TRANSITIONS[status];

  const actionMap: Record<TaskStatus, Partial<Record<TaskStatus, Omit<NextAction, 'targetStatus'>>>> = {
    TODO: {
      IN_PROGRESS: {
        action: 'start',
        label: 'Iniciar Tarefa',
        variant: 'default',
      },
      BLOCKED: {
        action: 'block',
        label: 'Bloquear',
        variant: 'destructive',
      },
    },
    IN_PROGRESS: {
      REVIEW: {
        action: 'submit_review',
        label: 'Enviar para Revisão',
        variant: 'default',
      },
      TODO: {
        action: 'revert_todo',
        label: 'Voltar para Fila',
        variant: 'secondary',
      },
      BLOCKED: {
        action: 'block',
        label: 'Bloquear',
        variant: 'destructive',
      },
    },
    REVIEW: {
      DONE: {
        action: 'complete',
        label: 'Concluir',
        variant: 'default',
      },
      IN_PROGRESS: {
        action: 'request_changes',
        label: 'Solicitar Alterações',
        variant: 'secondary',
      },
      BLOCKED: {
        action: 'block',
        label: 'Bloquear',
        variant: 'destructive',
      },
    },
    DONE: {},
    BLOCKED: {
      TODO: {
        action: 'unblock_todo',
        label: 'Desbloquear para Fila',
        variant: 'default',
      },
      IN_PROGRESS: {
        action: 'unblock_progress',
        label: 'Desbloquear e Retomar',
        variant: 'default',
      },
    },
  };

  return transitions
    .filter((targetStatus) => actionMap[status][targetStatus])
    .map((targetStatus) => ({
      targetStatus,
      ...actionMap[status][targetStatus]!,
    }));
}

// ============================================================================
// STATUS INFORMATION
// ============================================================================

/**
 * Gets display information for a status
 * @param status - Task status
 * @returns Status info with label, color class, and icon
 */
export function getStatusInfo(status: TaskStatus): StatusInfo {
  const statusInfoMap: Record<TaskStatus, StatusInfo> = {
    TODO: {
      label: 'A Fazer',
      color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100',
      icon: '◇',
    },
    IN_PROGRESS: {
      label: 'Em Andamento',
      color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
      icon: '◈',
    },
    REVIEW: {
      label: 'Em Revisão',
      color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100',
      icon: '◎',
    },
    DONE: {
      label: 'Concluído',
      color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
      icon: '◉',
    },
    BLOCKED: {
      label: 'Bloqueado',
      color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
      icon: '⬢',
    },
  };

  return statusInfoMap[status];
}

// ============================================================================
// WORKFLOW UTILITIES
// ============================================================================

/**
 * Gets all possible statuses in the workflow
 * @returns Array of all task statuses
 */
export function getAllStatuses(): TaskStatus[] {
  return ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'BLOCKED'];
}

/**
 * Checks if a status is a final state (no outgoing transitions)
 * @param status - Task status to check
 * @returns true if status is final, false otherwise
 */
export function isFinalStatus(status: TaskStatus): boolean {
  return VALID_TRANSITIONS[status].length === 0;
}

/**
 * Gets the default/initial status for new tasks
 * @returns Default task status
 */
export function getDefaultStatus(): TaskStatus {
  return 'TODO';
}

/**
 * Validates if a status string is a valid TaskStatus
 * @param status - String to validate
 * @returns true if valid status, false otherwise
 */
export function isValidStatus(status: string): status is TaskStatus {
  return ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'BLOCKED'].includes(status);
}
