import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { analyzeTask } from '@/lib/ai/task-analyzer';
import type { TaskAnalysis } from '@/types/ai';

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/tasks/[id]/analyze
 *
 * Analyzes a task using Claude AI and returns:
 * - Suggested agent role
 * - Estimated hours
 * - Complexity level (1-5)
 * - Relevant tags
 * - AI reasoning
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Fetch task from database
    const task = await prisma.task.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
      },
    });

    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Tarefa não encontrada' },
        { status: 404 }
      );
    }

    // Analyze task using Claude AI
    const analysis = await analyzeTask(
      task.title,
      task.description || undefined
    );

    if (!analysis) {
      return NextResponse.json(
        {
          success: false,
          error: 'Não foi possível analisar a tarefa. Tente novamente.',
        },
        { status: 500 }
      );
    }

    // Optionally update task with AI suggestions
    // You can uncomment this to auto-apply the suggestions
    /*
    await prisma.task.update({
      where: { id },
      data: {
        estimatedHours: analysis.estimatedHours,
        // tags: analysis.tags, // If you have a tags field in your schema
      },
    });
    */

    return NextResponse.json({
      success: true,
      data: {
        taskId: id,
        analysis,
      },
    });
  } catch (error) {
    console.error('AI analysis error:', error);

    // Check for specific error types
    if (error instanceof Error) {
      if (error.message.includes('ANTHROPIC_API_KEY')) {
        return NextResponse.json(
          {
            success: false,
            error: 'API key da Anthropic não configurada. Verifique o arquivo .env',
          },
          { status: 500 }
        );
      }

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

    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao analisar tarefa com IA',
      },
      { status: 500 }
    );
  }
}
