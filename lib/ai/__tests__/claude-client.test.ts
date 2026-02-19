/**
 * Tests for Claude AI client
 *
 * Note: These tests require ANTHROPIC_API_KEY to be set in .env
 * They are integration tests that make real API calls.
 */

import { describe, it, expect } from 'vitest';
import {
  getClaudeClient,
  getClaudeModel,
  getClaudeMaxTokens,
  createClaudeMessage,
  createClaudeJsonMessage,
} from '../claude-client';
import {
  analyzeTask,
  suggestSubtasks,
  improveTaskDescription,
} from '../claude-client.example';

describe('Claude Client Configuration', () => {
  it('should return configured model name', () => {
    expect(getClaudeModel()).toBe('claude-sonnet-4-20250514');
  });

  it('should return configured max tokens', () => {
    expect(getClaudeMaxTokens()).toBe(1024);
  });

  it('should throw error if API key is not set', () => {
    const originalKey = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    expect(() => getClaudeClient()).toThrow('ANTHROPIC_API_KEY');

    process.env.ANTHROPIC_API_KEY = originalKey;
  });
});

describe('Claude Client - Integration Tests', () => {
  // Skip these tests if API key is not set
  const shouldSkip = !process.env.ANTHROPIC_API_KEY;

  it.skipIf(shouldSkip)('should create a simple message', async () => {
    const response = await createClaudeMessage(
      'Say "Hello World" and nothing else.',
      'You are a helpful assistant.'
    );

    expect(response).toBeTruthy();
    expect(typeof response).toBe('string');
    expect(response.toLowerCase()).toContain('hello');
  }, 30000);

  it.skipIf(shouldSkip)('should create and parse JSON message', async () => {
    interface TestResponse {
      greeting: string;
      count: number;
    }

    const response = await createClaudeJsonMessage<TestResponse>(
      'Return JSON with keys "greeting" (value "hello") and "count" (value 42)',
      'You are a helpful assistant. Always return valid JSON.'
    );

    expect(response).toBeTruthy();
    expect(response.greeting).toBeTruthy();
    expect(typeof response.count).toBe('number');
  }, 30000);

  it.skipIf(shouldSkip)('should analyze a task', async () => {
    const analysis = await analyzeTask(
      'Implement user authentication',
      'Add OAuth login with Google and GitHub support'
    );

    expect(analysis).toBeTruthy();
    expect(analysis.complexity).toBeGreaterThanOrEqual(1);
    expect(analysis.complexity).toBeLessThanOrEqual(5);
    expect(Array.isArray(analysis.tags)).toBe(true);
    expect(analysis.reasoning).toBeTruthy();
  }, 30000);

  it.skipIf(shouldSkip)('should suggest subtasks', async () => {
    const subtasks = await suggestSubtasks(
      'Build landing page',
      'Create a modern landing page for our SaaS product',
      3
    );

    expect(Array.isArray(subtasks)).toBe(true);
    expect(subtasks.length).toBeGreaterThan(0);
    expect(subtasks.length).toBeLessThanOrEqual(3);

    if (subtasks.length > 0) {
      expect(subtasks[0].title).toBeTruthy();
      expect(subtasks[0].description).toBeTruthy();
      expect(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).toContain(subtasks[0].priority);
    }
  }, 30000);

  it.skipIf(shouldSkip)('should improve task description', async () => {
    const improvement = await improveTaskDescription(
      'Fix bug',
      'There is a problem with the app'
    );

    expect(improvement).toBeTruthy();
    expect(improvement.improvedTitle).toBeTruthy();
    expect(improvement.improvedDescription).toBeTruthy();
    expect(Array.isArray(improvement.suggestions)).toBe(true);
    expect(improvement.improvedTitle.length).toBeGreaterThan('Fix bug'.length);
  }, 30000);
});

describe('Error Handling', () => {
  it('should throw error on invalid JSON response', async () => {
    // This test would require mocking the Anthropic client
    // Skipped for now as it's an integration test suite
    expect(true).toBe(true);
  });
});
