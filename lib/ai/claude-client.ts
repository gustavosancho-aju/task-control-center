import Anthropic from '@anthropic-ai/sdk';

/**
 * Configuration for Claude AI client
 */
const CLAUDE_CONFIG = {
  model: 'claude-sonnet-4-20250514',
  maxTokens: 1024,
} as const;

/**
 * Get configured Anthropic client instance
 *
 * @throws {Error} If ANTHROPIC_API_KEY environment variable is not set
 * @returns {Anthropic} Configured Anthropic client
 */
export function getClaudeClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY environment variable is not set. ' +
      'Please add it to your .env file.'
    );
  }

  return new Anthropic({
    apiKey,
  });
}

/**
 * Get the default Claude model name
 */
export function getClaudeModel(): string {
  return CLAUDE_CONFIG.model;
}

/**
 * Get the default max tokens configuration
 */
export function getClaudeMaxTokens(): number {
  return CLAUDE_CONFIG.maxTokens;
}

/**
 * Create a message using Claude AI
 *
 * @param prompt - The prompt to send to Claude
 * @param systemPrompt - Optional system prompt for context
 * @returns The AI response text
 */
export async function createClaudeMessage(
  prompt: string,
  systemPrompt?: string
): Promise<string> {
  const client = getClaudeClient();

  const response = await client.messages.create({
    model: CLAUDE_CONFIG.model,
    max_tokens: CLAUDE_CONFIG.maxTokens,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  // Extract text from the first content block
  const firstBlock = response.content[0];
  if (firstBlock.type === 'text') {
    return firstBlock.text;
  }

  throw new Error('Unexpected response format from Claude API');
}

/**
 * Parse JSON response from Claude
 *
 * @param prompt - The prompt requesting JSON output
 * @param systemPrompt - Optional system prompt
 * @returns Parsed JSON object
 */
export async function createClaudeJsonMessage<T>(
  prompt: string,
  systemPrompt?: string
): Promise<T> {
  let response = await createClaudeMessage(prompt, systemPrompt);

  // Remove markdown code blocks if present (```json ... ```)
  response = response.trim();
  if (response.startsWith('```json')) {
    response = response.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (response.startsWith('```')) {
    response = response.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  try {
    return JSON.parse(response) as T;
  } catch (error) {
    console.error('Failed to parse Claude response:', response);
    throw new Error(
      `Failed to parse Claude response as JSON: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
