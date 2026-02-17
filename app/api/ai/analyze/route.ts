import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { analyzeTask } from '@/lib/ai/task-analyzer';

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const AnalyzeTaskSchema = z.object({
  title: z
    .string()
    .min(3, 'O título deve ter pelo menos 3 caracteres')
    .max(200, 'O título deve ter no máximo 200 caracteres'),
  description: z
    .string()
    .optional()
    .transform((val) => (val === '' ? undefined : val)),
});

type AnalyzeTaskInput = z.infer<typeof AnalyzeTaskSchema>;

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
//   limiter: Ratelimit.slidingWindow(10, "60 s"),
// });
//
// const { success } = await ratelimit.limit(identifier);
// if (!success) {
//   return NextResponse.json(
//     { success: false, error: 'Muitas requisições. Tente novamente em alguns segundos.' },
//     { status: 429 }
//   );
// }

// ============================================================================
// POST /api/ai/analyze
// ============================================================================

/**
 * POST /api/ai/analyze
 *
 * Analyzes a task using Claude AI and returns suggestions for:
 * - Appropriate agent (MAESTRO, SENTINEL, ARCHITECTON, PIXEL)
 * - Estimated hours to complete
 * - Complexity level (LOW, MEDIUM, HIGH, VERY_HIGH)
 * - Relevant tags
 * - AI reasoning
 *
 * Request body:
 * {
 *   "title": string (required, min 3 chars),
 *   "description": string (optional)
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "suggestedAgent": "ARCHITECTON",
 *     "estimatedHours": 4,
 *     "complexity": "MEDIUM",
 *     "tags": ["backend", "database"],
 *     "reasoning": "Esta tarefa envolve..."
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();

    // Validate input with Zod
    const validation = AnalyzeTaskSchema.safeParse(body);

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
    // if (!rateLimitSuccess) { ... }

    // Call AI analysis service
    const analysis = await analyzeTask(
      validatedData.title,
      validatedData.description
    );

    // Check if analysis was successful
    if (!analysis) {
      return NextResponse.json(
        {
          success: false,
          error: 'Não foi possível analisar a tarefa. Tente novamente.',
        },
        { status: 500 }
      );
    }

    // Return successful response
    return NextResponse.json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    console.error('Error in /api/ai/analyze:', error);

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
        error: 'Erro interno ao analisar tarefa',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// OPTIONS (CORS preflight)
// ============================================================================

/**
 * OPTIONS /api/ai/analyze
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
