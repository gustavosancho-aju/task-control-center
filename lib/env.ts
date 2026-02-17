import { z } from 'zod'

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url('DATABASE_URL deve ser uma URL válida'),

  // Anthropic AI
  ANTHROPIC_API_KEY: z
    .string()
    .min(1, 'ANTHROPIC_API_KEY é obrigatória')
    .startsWith('sk-ant-', 'ANTHROPIC_API_KEY deve começar com sk-ant-'),

  // App
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),

  // Security
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),

  // Analytics (optional — add your provider)
  // NEXT_PUBLIC_ANALYTICS_ID: z.string().optional(),

  // Error tracking (optional — add your provider)
  // SENTRY_DSN: z.string().url().optional(),
})

export type Env = z.infer<typeof envSchema>

function validateEnv(): Env {
  const parsed = envSchema.safeParse(process.env)

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors
    const messages = Object.entries(errors)
      .map(([key, msgs]) => `  ${key}: ${msgs?.join(', ')}`)
      .join('\n')

    console.error('❌ Variáveis de ambiente inválidas:\n' + messages)

    if (process.env.NODE_ENV === 'production') {
      throw new Error('Variáveis de ambiente de produção inválidas. Verifique .env.production.example')
    }

    // In dev/test, warn but continue
    console.warn('⚠️  Continuando em modo desenvolvimento com env incompleto')
  }

  return parsed.data ?? (process.env as unknown as Env)
}

export const env = validateEnv()
