/**
 * Examples of using the State Machine
 * This file demonstrates how to use the workflow state machine utilities
 */

import {
  isValidTransition,
  getNextActions,
  getStatusInfo,
  getAllStatuses,
  isFinalStatus,
  getDefaultStatus,
  isValidStatus,
  type TaskStatus,
} from './state-machine';

// ============================================================================
// EXAMPLE 1: Checking Valid Transitions
// ============================================================================

console.log('=== Example 1: Transition Validation ===');

// Valid transitions
console.log(isValidTransition('TODO', 'IN_PROGRESS')); // true
console.log(isValidTransition('IN_PROGRESS', 'REVIEW')); // true
console.log(isValidTransition('REVIEW', 'DONE')); // true

// Invalid transitions
console.log(isValidTransition('TODO', 'DONE')); // false
console.log(isValidTransition('DONE', 'TODO')); // false
console.log(isValidTransition('DONE', 'IN_PROGRESS')); // false

// ============================================================================
// EXAMPLE 2: Getting Available Actions
// ============================================================================

console.log('\n=== Example 2: Available Actions ===');

const todoActions = getNextActions('TODO');
console.log('Actions from TODO:', todoActions);
/*
[
  {
    action: 'start',
    targetStatus: 'IN_PROGRESS',
    label: 'Iniciar Tarefa',
    variant: 'default'
  },
  {
    action: 'block',
    targetStatus: 'BLOCKED',
    label: 'Bloquear',
    variant: 'destructive'
  }
]
*/

const inProgressActions = getNextActions('IN_PROGRESS');
console.log('Actions from IN_PROGRESS:', inProgressActions);

const doneActions = getNextActions('DONE');
console.log('Actions from DONE:', doneActions); // [] - no actions available

// ============================================================================
// EXAMPLE 3: Getting Status Information
// ============================================================================

console.log('\n=== Example 3: Status Information ===');

const todoInfo = getStatusInfo('TODO');
console.log('TODO Info:', todoInfo);
/*
{
  label: 'A Fazer',
  color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100',
  icon: '◇'
}
*/

const inProgressInfo = getStatusInfo('IN_PROGRESS');
console.log('IN_PROGRESS Info:', inProgressInfo);

const doneInfo = getStatusInfo('DONE');
console.log('DONE Info:', doneInfo);

// ============================================================================
// EXAMPLE 4: Rendering Status Badge (React Component)
// ============================================================================

console.log('\n=== Example 4: React Component Usage ===');

/*
function StatusBadge({ status }: { status: TaskStatus }) {
  const info = getStatusInfo(status);

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${info.color}`}>
      <span>{info.icon}</span>
      <span className="font-medium">{info.label}</span>
    </div>
  );
}
*/

// ============================================================================
// EXAMPLE 5: Rendering Action Buttons (React Component)
// ============================================================================

console.log('\n=== Example 5: Action Buttons ===');

/*
function TaskActions({ status, onAction }: {
  status: TaskStatus;
  onAction: (action: string, targetStatus: TaskStatus) => void;
}) {
  const actions = getNextActions(status);

  return (
    <div className="flex gap-2">
      {actions.map((action) => (
        <Button
          key={action.action}
          variant={action.variant}
          onClick={() => onAction(action.action, action.targetStatus)}
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
}
*/

// ============================================================================
// EXAMPLE 6: Workflow Utilities
// ============================================================================

console.log('\n=== Example 6: Workflow Utilities ===');

// Get all statuses
const allStatuses = getAllStatuses();
console.log('All Statuses:', allStatuses);
// ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'BLOCKED']

// Check if status is final
console.log('Is DONE final?', isFinalStatus('DONE')); // true
console.log('Is TODO final?', isFinalStatus('TODO')); // false

// Get default status
console.log('Default Status:', getDefaultStatus()); // 'TODO'

// Validate status string
console.log('Is "TODO" valid?', isValidStatus('TODO')); // true
console.log('Is "INVALID" valid?', isValidStatus('INVALID')); // false

// ============================================================================
// EXAMPLE 7: Task State Management Hook
// ============================================================================

console.log('\n=== Example 7: Custom Hook ===');

/*
function useTaskWorkflow(taskId: string) {
  const [status, setStatus] = useState<TaskStatus>('TODO');

  const canTransition = useCallback((targetStatus: TaskStatus) => {
    return isValidTransition(status, targetStatus);
  }, [status]);

  const transition = useCallback(async (targetStatus: TaskStatus) => {
    if (!canTransition(targetStatus)) {
      throw new Error(`Invalid transition from ${status} to ${targetStatus}`);
    }

    // API call to update task
    await updateTaskStatus(taskId, targetStatus);
    setStatus(targetStatus);
  }, [taskId, status, canTransition]);

  const availableActions = useMemo(() => {
    return getNextActions(status);
  }, [status]);

  const statusInfo = useMemo(() => {
    return getStatusInfo(status);
  }, [status]);

  return {
    status,
    statusInfo,
    availableActions,
    canTransition,
    transition,
  };
}
*/

// ============================================================================
// EXAMPLE 8: API Route Handler
// ============================================================================

console.log('\n=== Example 8: API Route ===');

/*
// app/api/tasks/[id]/transition/route.ts

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { targetStatus } = await request.json();

  // Validate status
  if (!isValidStatus(targetStatus)) {
    return NextResponse.json(
      { error: 'Invalid status' },
      { status: 400 }
    );
  }

  // Get current task
  const task = await db.task.findUnique({
    where: { id: params.id }
  });

  if (!task) {
    return NextResponse.json(
      { error: 'Task not found' },
      { status: 404 }
    );
  }

  // Validate transition
  if (!isValidTransition(task.status as TaskStatus, targetStatus)) {
    return NextResponse.json(
      { error: `Cannot transition from ${task.status} to ${targetStatus}` },
      { status: 400 }
    );
  }

  // Update task
  const updatedTask = await db.task.update({
    where: { id: params.id },
    data: { status: targetStatus }
  });

  return NextResponse.json(updatedTask);
}
*/
