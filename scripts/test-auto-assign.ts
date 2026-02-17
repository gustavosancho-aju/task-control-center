/**
 * Test script for auto-assign endpoint
 *
 * Usage:
 *   npx ts-node scripts/test-auto-assign.ts [taskId]
 *
 * If no taskId is provided, creates a new task and auto-assigns
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

async function createTestTask() {
  console.log('📝 Creating test task...\n');

  const response = await fetch(`${BASE_URL}/api/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Implementar autenticação OAuth com Google e GitHub',
      description: 'Adicionar suporte para login social usando OAuth 2.0. Incluir providers Google e GitHub com callback handlers e gestão de tokens.',
      priority: 'HIGH',
      status: 'TODO',
    }),
  });

  const result = await response.json();

  if (!result.success) {
    console.error('❌ Failed to create task:', result.error);
    process.exit(1);
  }

  console.log('✅ Task created successfully!');
  console.log(`   ID: ${result.data.id}`);
  console.log(`   Title: ${result.data.title}\n`);

  return result.data.id;
}

async function autoAssignAgent(taskId: string) {
  console.log(`🤖 Auto-assigning agent to task ${taskId}...\n`);

  const response = await fetch(`${BASE_URL}/api/tasks/${taskId}/auto-assign`, {
    method: 'POST',
  });

  const result = await response.json();

  if (!result.success) {
    console.error('❌ Failed to auto-assign:', result.error);
    if (result.data?.currentAgent) {
      console.log(`   Current agent: ${result.data.currentAgent.name}`);
    }
    process.exit(1);
  }

  console.log('✅ Agent auto-assigned successfully!\n');

  console.log('📊 Analysis Results:');
  console.log(`   Suggested Agent: ${result.data.analysis.suggestedAgent}`);
  console.log(`   Estimated Hours: ${result.data.analysis.estimatedHours}h`);
  console.log(`   Complexity: ${result.data.analysis.complexity}`);
  console.log(`   Tags: ${result.data.analysis.tags.join(', ')}`);
  console.log(`   Reasoning: ${result.data.analysis.reasoning.substring(0, 100)}...\n`);

  console.log('👤 Assigned Agent:');
  console.log(`   ${result.data.assignedAgent.emoji} ${result.data.assignedAgent.name}`);
  console.log(`   Description: ${result.data.assignedAgent.description}`);
  console.log(`   Color: ${result.data.assignedAgent.color}\n`);

  console.log('📋 Updated Task:');
  console.log(`   ID: ${result.data.task.id}`);
  console.log(`   Title: ${result.data.task.title}`);
  console.log(`   Status: ${result.data.task.status}`);
  console.log(`   Agent: ${result.data.task.agentName}`);
  console.log(`   Updated At: ${result.data.task.updatedAt}\n`);

  return result;
}

async function main() {
  const args = process.argv.slice(2);
  const taskId = args[0];

  console.log('🚀 Auto-Assign Test Script\n');
  console.log('='.repeat(50) + '\n');

  try {
    let targetTaskId = taskId;

    if (!targetTaskId) {
      targetTaskId = await createTestTask();
      console.log('─'.repeat(50) + '\n');
    }

    await autoAssignAgent(targetTaskId);

    console.log('='.repeat(50));
    console.log('✨ Test completed successfully!');
  } catch (error) {
    console.error('\n❌ Error during test:', error);
    process.exit(1);
  }
}

main();
