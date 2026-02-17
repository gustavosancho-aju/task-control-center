/**
 * Claude AI Integration - Main exports
 */

// Core client functions
export {
  getClaudeClient,
  getClaudeModel,
  getClaudeMaxTokens,
  createClaudeMessage,
  createClaudeJsonMessage,
} from './claude-client';

// Task analyzer functions (primary API)
export {
  analyzeTask,
  suggestSubtasks,
  improveTaskDescription,
  analyzeBulkTasks,
  isValidTaskAnalysis,
  isValidSubtask,
  isValidImprovement,
} from './task-analyzer';

// Re-export types for convenience
export type {
  TaskAnalysis,
  SubtaskSuggestion,
  TaskImprovement,
  ClaudeResponse,
} from '@/types/ai';
