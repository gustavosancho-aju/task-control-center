import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { improveTaskDescription } from '@/lib/ai/task-analyzer';

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const ImproveTaskSchema = z.object({
  title: z
    .string()
    .min(3, 'O título deve ter pelo menos 3 caracteres')
    .max(200, 'O título deve ter no máximo 200 caracteres'),
  description: z
    .string()
    .optional()
    .transform((val) => (val === '' ? undefined : val)),
});

type ImproveTaskInput = z.infer<typeof ImproveTaskSchema>;

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
// POST /api/ai/improve
// ============================================================================

/**
 * POST /api/ai/improve
 *
 * Improves a task's title and description to make it more clear,
 * complete, and actionable using Claude AI.
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
 *     "improvedTitle": "Implementar autenticação JWT com refresh tokens",
 *     "improvedDescription": "Criar sistema completo de autenticação...",
 *     "suggestions": [
 *       "Adicionar critérios de aceitação",
 *       "Especificar tecnologias a usar"
 *     ]
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();

    // Validate input with Zod
    const validation = ImproveTaskSchema.safeParse(body);

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

    // Call AI improvement service
    const improvement = await improveTaskDescription(
      validatedData.title,
      validatedData.description
    );

    // Check if improvement was generated successfully
    if (!improvement) {
      return NextResponse.json(
        {
          success: false,
          error: 'Não foi possível gerar melhorias para a tarefa. Tente novamente.',
        },
        { status: 500 }
      );
    }

    // Return successful response
    return NextResponse.json({
      success: true,
      data: improvement,
    });
  } catch (error) {
    console.error('Error in /api/ai/improve:', error);

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
        error: 'Erro interno ao melhorar descrição da tarefa',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// OPTIONS (CORS preflight)
// ============================================================================

/**
 * OPTIONS /api/ai/improve
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
