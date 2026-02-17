import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { generateReportPDF } from "@/lib/export/pdf-generator"
import { generateFullExcel } from "@/lib/export/excel-generator"

function binaryResponse(data: Uint8Array, contentType: string, filename: string) {
  const arrayBuffer: ArrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer
  return new Response(arrayBuffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}

// GET /api/export/report?format=pdf|xlsx
export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const format = url.searchParams.get("format") || "pdf"

    // Fetch all data in parallel
    const [tasks, agents, executions] = await Promise.all([
      prisma.task.findMany({
        include: {
          agent: { select: { name: true, role: true } },
          tags: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.agent.findMany({
        include: {
          _count: { select: { tasks: true } },
        },
      }),
      prisma.agentExecution.findMany({
        where: { status: "COMPLETED" },
        select: { startedAt: true, completedAt: true },
      }),
    ])

    // Compute metrics
    const total = tasks.length
    const completed = tasks.filter((t) => t.status === "DONE").length
    const inProgress = tasks.filter((t) => t.status === "IN_PROGRESS").length
    const todo = tasks.filter((t) => t.status === "TODO").length
    const review = tasks.filter((t) => t.status === "REVIEW").length
    const blocked = tasks.filter((t) => t.status === "BLOCKED").length
    const completionRate = total > 0 ? (completed / total) * 100 : 0

    // Average completion time
    const completionHours = executions
      .filter((e) => e.startedAt && e.completedAt)
      .map((e) => (e.completedAt!.getTime() - e.startedAt!.getTime()) / (1000 * 60 * 60))

    const avgCompletionHours =
      completionHours.length > 0
        ? completionHours.reduce((a, b) => a + b, 0) / completionHours.length
        : null

    // Agent performance
    const agentPerformance = agents.map((agent) => {
      const agentTasks = tasks.filter((t) => t.agentId === agent.id)
      const agentCompleted = agentTasks.filter((t) => t.status === "DONE").length
      return {
        name: agent.name,
        role: agent.role,
        tasksCount: agentTasks.length,
        completedCount: agentCompleted,
        successRate: agentTasks.length > 0 ? (agentCompleted / agentTasks.length) * 100 : 0,
      }
    })

    const metrics = {
      total,
      completed,
      inProgress,
      blocked,
      todo,
      review,
      completionRate,
      avgCompletionHours,
    }

    const serializedTasks = tasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      createdAt: t.createdAt.toISOString(),
      dueDate: t.dueDate?.toISOString() || null,
      completedAt: t.completedAt?.toISOString() || null,
      estimatedHours: t.estimatedHours,
      actualHours: t.actualHours,
      agent: t.agent ? { name: t.agent.name, role: t.agent.role } : null,
      tags: t.tags,
    }))

    // --- PDF ---
    if (format === "pdf") {
      const buffer = generateReportPDF({
        tasks: serializedTasks,
        metrics,
        agents: agentPerformance,
        generatedAt: new Date().toISOString(),
      })

      return binaryResponse(buffer, "application/pdf", `relatorio-${Date.now()}.pdf`)
    }

    // --- XLSX ---
    if (format === "xlsx") {
      const buffer = generateFullExcel(serializedTasks, agentPerformance, metrics)

      return binaryResponse(buffer, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", `relatorio-${Date.now()}.xlsx`)
    }

    return NextResponse.json(
      { success: false, error: "Formato invalido. Use: pdf ou xlsx" },
      { status: 400 }
    )
  } catch (error) {
    console.error("Erro ao gerar relatorio:", error)
    return NextResponse.json(
      { success: false, error: "Erro interno ao gerar relatorio" },
      { status: 500 }
    )
  }
}
