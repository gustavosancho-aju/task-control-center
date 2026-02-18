import Anthropic from '@anthropic-ai/sdk';

/**
 * Configuration for Claude AI client
 */
const CLAUDE_CONFIG = {
  model: 'claude-sonnet-4-20250514',
  maxTokens: 8192,
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
/**
 * Sanitiza a string JSON removendo problemas comuns de LLMs:
 * - Comentários de linha (// ...)
 * - Trailing commas antes de } ou ]
 * - Texto antes/depois do JSON
 */
function sanitizeJsonResponse(raw: string): string {
  let s = raw.trim()

  // Remove markdown code blocks
  if (s.startsWith('```json')) {
    s = s.replace(/^```json\s*/, '').replace(/\s*```$/, '')
  } else if (s.startsWith('```')) {
    s = s.replace(/^```\s*/, '').replace(/\s*```$/, '')
  }

  // Extrai apenas o JSON (primeira { até última })
  const firstBrace = s.indexOf('{')
  const lastBrace = s.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    s = s.slice(firstBrace, lastBrace + 1)
  }

  // Remove comentários de linha (// ...) que não estão dentro de strings
  s = s.replace(/(?<="[^"]*".*?)\/\/[^\n]*/g, '')
  // Fallback mais agressivo: remove qualquer // seguido de texto até fim de linha
  // mas só se estiver fora de aspas (heurística simples)
  s = s.replace(/,?\s*\/\/[^\n"]*/g, '')

  // Remove trailing commas antes de } ou ]
  s = s.replace(/,\s*([}\]])/g, '$1')

  return s.trim()
}

export async function createClaudeJsonMessage<T>(
  prompt: string,
  systemPrompt?: string
): Promise<T> {
  const response = await createClaudeMessage(prompt, systemPrompt)
  const sanitized = sanitizeJsonResponse(response)

  try {
    return JSON.parse(sanitized) as T
  } catch (error) {
    console.error('Failed to parse Claude response. Raw:', response)
    console.error('Sanitized:', sanitized)
    throw new Error(
      `Failed to parse Claude response as JSON: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}
