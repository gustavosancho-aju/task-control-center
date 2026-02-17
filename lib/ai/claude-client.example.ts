/**
 * Example usage of Claude AI client for task management
 */

import {
  createClaudeMessage,
  createClaudeJsonMessage,
} from './claude-client';
import type {
  TaskAnalysis,
  SubtaskSuggestion,
  TaskImprovement,
} from '@/types/ai';

// ============================================================================
// EXAMPLE 1: Analyze a task and suggest an agent
// ============================================================================

export async function analyzeTask(
  title: string,
  description: string
): Promise<TaskAnalysis> {
  const systemPrompt = `You are an AI assistant that analyzes software development tasks and provides structured recommendations.

Your role is to:
1. Suggest the most appropriate agent role (MAESTRO for coordination, SENTINEL for review/quality, ARCHITECTON for architecture/design, PIXEL for UI/UX)
2. Estimate the hours needed to complete the task
3. Rate the complexity on a 1-5 scale
4. Generate relevant tags
5. Provide clear reasoning for your analysis

Always respond with valid JSON matching this structure:
{
  "suggestedAgent": "MAESTRO" | "SENTINEL" | "ARCHITECTON" | "PIXEL" | null,
  "estimatedHours": number | null,
  "complexity": 1 | 2 | 3 | 4 | 5,
  "tags": string[],
  "reasoning": string
}`;

  const prompt = `Analyze this task and provide recommendations:

Title: ${title}
Description: ${description}

Provide your analysis in JSON format.`;

  return createClaudeJsonMessage<TaskAnalysis>(prompt, systemPrompt);
}

// ============================================================================
// EXAMPLE 2: Break down a task into subtasks
// ============================================================================

export async function suggestSubtasks(
  title: string,
  description: string,
  maxSubtasks: number = 5
): Promise<SubtaskSuggestion[]> {
  const systemPrompt = `You are an AI assistant that breaks down complex tasks into manageable subtasks.

Generate ${maxSubtasks} or fewer subtasks that:
1. Cover all aspects of the main task
2. Are independently completable
3. Have clear titles and descriptions
4. Include appropriate priority levels
5. Have realistic time estimates

Always respond with valid JSON array of subtasks:
[
  {
    "title": string,
    "description": string,
    "priority": "LOW" | "MEDIUM" | "HIGH" | "URGENT",
    "estimatedHours": number | null
  }
]`;

  const prompt = `Break down this task into ${maxSubtasks} or fewer subtasks:

Title: ${title}
Description: ${description}

Provide your subtask suggestions in JSON format.`;

  return createClaudeJsonMessage<SubtaskSuggestion[]>(prompt, systemPrompt);
}

// ============================================================================
// EXAMPLE 3: Improve a task description
// ============================================================================

export async function improveTaskDescription(
  title: string,
  description: string
): Promise<TaskImprovement> {
  const systemPrompt = `You are an AI assistant that improves task descriptions for better clarity and completeness.

Provide:
1. An improved, concise title (max 100 characters)
2. An improved description with clear objectives, context, and acceptance criteria
3. Specific suggestions for what was improved and why

Always respond with valid JSON:
{
  "improvedTitle": string,
  "improvedDescription": string,
  "suggestions": string[]
}`;

  const prompt = `Improve this task definition:

Current Title: ${title}
Current Description: ${description || '(no description provided)'}

Provide your improvements in JSON format.`;

  return createClaudeJsonMessage<TaskImprovement>(prompt, systemPrompt);
}

// ============================================================================
// EXAMPLE 4: Simple text generation
// ============================================================================

export async function generateTaskNotes(taskId: string): Promise<string> {
  const systemPrompt = `You are a helpful assistant that generates concise task notes.`;

  const prompt = `Generate brief notes for task ${taskId} that might be helpful for the assignee.`;

  return createClaudeMessage(prompt, systemPrompt);
}

// ============================================================================
// USAGE EXAMPLES IN API ROUTES
// ============================================================================

/*
// In an API route (e.g., app/api/tasks/analyze/route.ts):

import { NextRequest, NextResponse } from 'next/server';
import { analyzeTask } from '@/lib/ai/claude-client.example';

export async function POST(request: NextRequest) {
  try {
    const { title, description } = await request.json();

    const analysis = await analyzeTask(title, description);

    return NextResponse.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('AI analysis error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'AI analysis failed'
      },
      { status: 500 }
    );
  }
}
*/

/*
// In a component:

const analyzeMyTask = async () => {
  const response = await fetch('/api/tasks/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: taskTitle,
      description: taskDescription,
    }),
  });

  const { success, data, error } = await response.json();

  if (success) {
    console.log('AI Analysis:', data);
    // Use data.suggestedAgent, data.estimatedHours, etc.
  } else {
    console.error('Analysis failed:', error);
  }
};
*/
