/**
 * AI-related TypeScript interfaces for Claude integration
 */

/**
 * Analysis of a task provided by Claude AI
 */
export interface TaskAnalysis {
  /** Suggested agent role for the task */
  suggestedAgent: 'MAESTRO' | 'SENTINEL' | 'ARCHITECTON' | 'PIXEL';
  /** Estimated hours to complete the task */
  estimatedHours: number;
  /** Complexity level */
  complexity: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
  /** Auto-generated tags based on task content */
  tags: string[];
  /** AI reasoning behind the analysis */
  reasoning: string;
}

/**
 * Suggestion for breaking down a task into subtasks
 */
export interface SubtaskSuggestion {
  /** Title of the subtask */
  title: string;
  /** Detailed description */
  description: string;
  /** Priority level */
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  /** Estimated hours for this subtask */
  estimatedHours: number;
}

/**
 * Improvement suggestions for a task
 */
export interface TaskImprovement {
  /** Improved version of the task title */
  improvedTitle: string;
  /** Improved version of the task description */
  improvedDescription: string;
  /** List of specific improvement suggestions */
  suggestions: string[];
}

/**
 * Claude API response wrapper
 */
export interface ClaudeResponse<T> {
  /** Whether the request was successful */
  success: boolean;
  /** The AI-generated data */
  data?: T;
  /** Error message if unsuccessful */
  error?: string;
}
