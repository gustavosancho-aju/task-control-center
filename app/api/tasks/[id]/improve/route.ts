import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { improveTaskDescription } from '@/lib/ai/task-analyzer';
import type { TaskImprovement } from '@/types/ai';

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/tasks/[id]/improve
 *
 * Uses AI to improve task title and description
 *
 * Body (optional):
 * - autoApply: boolean (default: false) - Automatically update the task
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { autoApply = false } = body;

    // Fetch task
    const task = await prisma.task.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
      },
    });

    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Tarefa não encontrada' },
        { status: 404 }
      );
    }

    // Get AI improvements
    const improvement = await improveTaskDescription(
      task.title,
      task.description || undefined
    );

    if (!improvement) {
      return NextResponse.json(
        {
          success: false,
          error: 'Não foi possível gerar melhorias. Tente novamente.',
        },
        { status: 500 }
      );
    }

    // Optionally auto-apply improvements
    let updatedTask = null;
    if (autoApply) {
      updatedTask = await prisma.task.update({
        where: { id },
        data: {
          title: improvement.improvedTitle,
          description: improvement.improvedDescription,
          updatedAt: new Date(),
        },
        include: {
          agent: true,
          statusHistory: {
            orderBy: { changedAt: 'desc' },
            take: 20,
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        taskId: id,
        original: {
          title: task.title,
          description: task.description,
        },
        improvement,
        applied: autoApply,
        task: updatedTask,
      },
    });
  } catch (error) {
    console.error('Task improvement error:', error);

    if (error instanceof Error) {
      if (error.message.includes('ANTHROPIC_API_KEY')) {
        return NextResponse.json(
          {
            success: false,
            error: 'API key da Anthropic não configurada',
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao melhorar tarefa',
      },
      { status: 500 }
    );
  }
}
