import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { analyzeTask } from '@/lib/ai/task-analyzer';

// ============================================================================
// POST /api/tasks/[id]/auto-assign - Auto-assign agent via AI
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // ========================================================================
    // 1. FETCH TASK
    // ========================================================================

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        agent: true,
      },
    });

    if (!task) {
      return NextResponse.json(
        {
          success: false,
          error: 'Tarefa não encontrada',
        },
        { status: 404 }
      );
    }

    // ========================================================================
    // 2. CHECK IF ALREADY HAS AGENT
    // ========================================================================

    if (task.agentId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Tarefa já possui agente atribuído',
          data: {
            currentAgent: task.agent,
          },
        },
        { status: 400 }
      );
    }

    // ========================================================================
    // 3. ANALYZE TASK WITH AI
    // ========================================================================

    const analysis = await analyzeTask(task.title, task.description || undefined);

    if (!analysis) {
      return NextResponse.json(
        {
          success: false,
          error: 'Erro ao analisar tarefa com IA',
        },
        { status: 500 }
      );
    }

    // ========================================================================
    // 4. MAP SUGGESTED AGENT TO AGENT ID
    // ========================================================================

    // Map AI agent name to database agent name
    // Adjust this mapping according to your database
    const agentNameMap: Record<string, string> = {
      MAESTRO: 'Maestro',
      SENTINEL: 'Sentinel',
      ARCHITECTON: 'Architecton',
      PIXEL: 'Pixel',
    };

    const agentName = agentNameMap[analysis.suggestedAgent];

    if (!agentName) {
      return NextResponse.json(
        {
          success: false,
          error: `Agente sugerido desconhecido: ${analysis.suggestedAgent}`,
        },
        { status: 400 }
      );
    }

    // ========================================================================
    // 5. FIND AGENT IN DATABASE
    // ========================================================================

    const agent = await prisma.agent.findFirst({
      where: {
        name: agentName,
      },
    });

    if (!agent) {
      return NextResponse.json(
        {
          success: false,
          error: `Agente "${agentName}" não encontrado no banco de dados`,
          suggestion: `Certifique-se de que o agente existe na tabela Agent`,
        },
        { status: 404 }
      );
    }

    // ========================================================================
    // 6. ASSIGN AGENT TO TASK
    // ========================================================================

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        agentId: agent.id,
        agentName: agent.name,
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

    // ========================================================================
    // 7. CREATE HISTORY ENTRY
    // ========================================================================

    await prisma.statusChange.create({
      data: {
        taskId: id,
        fromStatus: updatedTask.status,
        toStatus: updatedTask.status,
        notes: `Agente ${agent.name} atribuído automaticamente via IA (${analysis.complexity} complexity, ${analysis.estimatedHours}h estimated)`,
      },
    });

    // ========================================================================
    // 8. RETURN SUCCESS
    // ========================================================================

    return NextResponse.json({
      success: true,
      data: {
        task: updatedTask,
        analysis: analysis,
        assignedAgent: agent,
      },
    });
  } catch (error) {
    console.error('Error in auto-assign endpoint:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// CORS SUPPORT
// ============================================================================

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
