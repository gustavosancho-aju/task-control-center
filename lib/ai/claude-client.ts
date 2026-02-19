import Anthropic from '@anthropic-ai/sdk';
import { spawnSync } from 'child_process'

/**
 * Available Claude models by capability tier
 */
export const CLAUDE_MODELS = {
  /** Full reasoning — code generation, security audits, complex output */
  sonnet: 'claude-sonnet-4-5-20250929',
  /** Fast + cheap — planning, analysis, review reports, JSON output */
  haiku: 'claude-haiku-4-5-20251001',
} as const

export type ClaudeModel = typeof CLAUDE_MODELS[keyof typeof CLAUDE_MODELS]

export interface ClaudeCallOptions {
  model?: ClaudeModel
  maxTokens?: number
}

/**
 * Configuration for Claude AI client
 */
const CLAUDE_CONFIG = {
  model: CLAUDE_MODELS.sonnet,
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
 * Executa uma chamada ao Claude via CLI local (claude -p).
 * Usa a assinatura Claude.ai do usuário — sem consumo de API key.
 * Ativado quando USE_CLAUDE_CODE=true no ambiente.
 */
function createClaudeMessageCLI(prompt: string, systemPrompt?: string): string {
  // Monta o prompt completo: system + user separados por divisor claro
  const fullPrompt = systemPrompt
    ? `${systemPrompt}\n\n---\n\n${prompt}`
    : prompt

  const result = spawnSync('claude', ['-p', '--dangerously-skip-permissions', fullPrompt], {
    encoding: 'utf-8',
    timeout: 180000, // 3 min
    maxBuffer: 10 * 1024 * 1024, // 10 MB
  })

  if (result.error) {
    throw new Error(`Claude CLI error: ${result.error.message}`)
  }
  if (result.status !== 0) {
    throw new Error(`Claude CLI exited with code ${result.status}: ${result.stderr?.slice(0, 500)}`)
  }

  return result.stdout.trim()
}

/**
 * Create a message using Claude AI with automatic retry on rate limit errors (429)
 *
 * @param prompt - The prompt to send to Claude
 * @param systemPrompt - Optional system prompt for context
 * @param options - Optional model/maxTokens override
 * @returns The AI response text
 */
export async function createClaudeMessage(
  prompt: string,
  systemPrompt?: string,
  options?: ClaudeCallOptions
): Promise<string> {
  // Modo CLI: usa Claude Code local (assinatura Claude.ai) em vez da API
  if (process.env.USE_CLAUDE_CODE === 'true') {
    return createClaudeMessageCLI(prompt, systemPrompt)
  }

  const client = getClaudeClient();
  const maxRetries = 3

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await client.messages.create({
        model: options?.model ?? CLAUDE_CONFIG.model,
        max_tokens: options?.maxTokens ?? CLAUDE_CONFIG.maxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }],
      })

      const firstBlock = response.content[0]
      if (firstBlock.type === 'text') return firstBlock.text
      throw new Error('Unexpected response format from Claude API')
    } catch (error) {
      const isRateLimit =
        (error instanceof Error && error.message.includes('429')) ||
        (typeof error === 'object' && error !== null && 'status' in error && (error as { status: number }).status === 429)

      if (isRateLimit && attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 2000 // 2s, 4s, 8s
        console.warn(`[claude-client] Rate limit 429 — retry ${attempt + 1}/${maxRetries} em ${delay / 1000}s`)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
      throw error
    }
  }

  throw new Error('Unreachable')
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
  systemPrompt?: string,
  options?: ClaudeCallOptions
): Promise<T> {
  const response = await createClaudeMessage(prompt, systemPrompt, options)
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
