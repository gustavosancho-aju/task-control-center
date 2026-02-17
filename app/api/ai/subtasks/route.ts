import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { suggestSubtasks } from '@/lib/ai/task-analyzer';

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const SubtasksRequestSchema = z.object({
  title: z
    .string()
    .min(3, 'O título deve ter pelo menos 3 caracteres')
    .max(200, 'O título deve ter no máximo 200 caracteres'),
  description: z
    .string()
    .optional()
    .transform((val) => (val === '' ? undefined : val)),
  maxSubtasks: z
    .number()
    .int()
    .min(1)
    .max(5)
    .optional()
    .default(5),
});

type SubtasksRequestInput = z.infer<typeof SubtasksRequestSchema>;

// ============================================================================
// RATE LIMITING
// ============================================================================

// TODO: Implement rate limiting
// Consider using:
// - upstash/ratelimit for serverless
// - redis for traditional hosting
// - memory-based rate limiting for development
//
// Example implementation:
// const ratelimit = new Ratelimit({
//   redis: Redis.fromEnv(),
//   limiter: Ratelimit.slidingWindow(5, "60 s"), // 5 requests per minute
// });

// ============================================================================
// POST /api/ai/subtasks
// ============================================================================

/**
 * POST /api/ai/subtasks
 *
 * Suggests subtasks for breaking down a complex task into smaller,
 * manageable pieces using Claude AI.
 *
 * Request body:
 * {
 *   "title": string (required, min 3 chars),
 *   "description": string (optional),
 *   "maxSubtasks": number (optional, default 5, max 5)
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "title": "Criar schema do banco",
 *       "description": "Definir modelos Prisma...",
 *       "priority": "HIGH",
 *       "estimatedHours": 2
 *     },
 *     ...
 *   ]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();

    // Validate input with Zod
    const validation = SubtasksRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Dados inválidos',
          details: validation.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }

    const validatedData = validation.data;

    // TODO: Check rate limit here
    // const identifier = request.ip ?? 'anonymous';
    // const { success: rateLimitSuccess } = await ratelimit.limit(identifier);
    // if (!rateLimitSuccess) {
    //   return NextResponse.json(
    //     { success: false, error: 'Muitas requisições. Tente novamente em alguns segundos.' },
    //     { status: 429 }
    //   );
    // }

    // Call AI subtask suggestion service
    const subtasks = await suggestSubtasks(
      validatedData.title,
      validatedData.description
    );

    // Check if suggestions were generated successfully
    if (!subtasks) {
      return NextResponse.json(
        {
          success: false,
          error: 'Não foi possível gerar sugestões de subtarefas. Tente novamente.',
        },
        { status: 500 }
      );
    }

    // Limit to maxSubtasks (already limited to 5 in task-analyzer, but enforce here too)
    const limitedSubtasks = subtasks.slice(0, validatedData.maxSubtasks);

    // Return successful response
    return NextResponse.json({
      success: true,
      data: limitedSubtasks,
    });
  } catch (error) {
    console.error('Error in /api/ai/subtasks:', error);

    // Check for specific error types
    if (error instanceof Error) {
      // Anthropic API errors
      if (error.message.includes('ANTHROPIC_API_KEY')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Serviço de IA não configurado corretamente',
          },
          { status: 500 }
        );
      }

      // API rate limit errors
      if (error.message.includes('rate_limit')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Limite de requisições atingido. Tente novamente em alguns segundos.',
          },
          { status: 429 }
        );
      }

      // JSON parsing errors
      if (error.message.includes('parse')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Erro ao processar resposta da IA. Tente novamente.',
          },
          { status: 500 }
        );
      }
    }

    // Generic error response
    return NextResponse.json(
      {
        success: false,
        error: 'Erro interno ao gerar sugestões de subtarefas',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// OPTIONS (CORS preflight)
// ============================================================================

/**
 * OPTIONS /api/ai/subtasks
 *
 * Handles CORS preflight requests
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
