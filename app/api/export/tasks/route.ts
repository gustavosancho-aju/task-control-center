import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { generateTasksPDF } from "@/lib/export/pdf-generator"
import { generateTasksExcel } from "@/lib/export/excel-generator"

function binaryResponse(data: Uint8Array, contentType: string, filename: string) {
  const arrayBuffer: ArrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer
  return new Response(arrayBuffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}

// GET /api/export/tasks?format=json|csv|xlsx|pdf&status=TODO,DONE&priority=HIGH&agentId=xxx
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const format = searchParams.get("format") || "json"
    const statusFilter = searchParams.get("status")
    const priorityFilter = searchParams.get("priority")
    const agentId = searchParams.get("agentId")
    const search = searchParams.get("search")

    // Build Prisma where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}

    if (statusFilter) {
      const statuses = statusFilter.split(",")
      where.status = { in: statuses }
    }

    if (priorityFilter) {
      const priorities = priorityFilter.split(",")
      where.priority = { in: priorities }
    }

    if (agentId) {
      if (agentId === "NO_AGENT") {
        where.agentId = null
      } else {
        where.agentId = agentId
      }
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ]
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        agent: { select: { name: true, role: true } },
        tags: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    // --- JSON ---
    if (format === "json") {
      return NextResponse.json({ success: true, data: tasks, total: tasks.length })
    }

    // --- CSV ---
    if (format === "csv") {
      const headers = [
        "ID", "Titulo", "Descricao", "Status", "Prioridade",
        "Agente", "Data Criacao", "Prazo", "Conclusao",
        "Horas Estimadas", "Horas Reais", "Tags",
      ]

      const rows = tasks.map((t) => [
        t.id,
        `"${(t.title || "").replace(/"/g, '""')}"`,
        `"${(t.description || "").replace(/"/g, '""')}"`,
        t.status,
        t.priority,
        t.agent?.name || "",
        t.createdAt.toISOString(),
        t.dueDate?.toISOString() || "",
        t.completedAt?.toISOString() || "",
        t.estimatedHours?.toString() || "",
        t.actualHours?.toString() || "",
        `"${t.tags.map((tag) => tag.name).join(", ")}"`,
      ])

      const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
      const csvBuffer = new TextEncoder().encode("\uFEFF" + csv) // BOM for Excel compatibility
      return binaryResponse(csvBuffer, "text/csv; charset=utf-8", `tarefas-${Date.now()}.csv`)
    }

    // --- XLSX ---
    if (format === "xlsx") {
      const serialized = tasks.map((t) => ({
        ...t,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        dueDate: t.dueDate?.toISOString() || null,
        completedAt: t.completedAt?.toISOString() || null,
        agent: t.agent ? { name: t.agent.name, role: t.agent.role } : null,
        tags: t.tags,
      }))

      const buffer = generateTasksExcel(serialized)
      return binaryResponse(buffer, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", `tarefas-${Date.now()}.xlsx`)
    }

    // --- PDF ---
    if (format === "pdf") {
      const serialized = tasks.map((t) => ({
        ...t,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        dueDate: t.dueDate?.toISOString() || null,
        completedAt: t.completedAt?.toISOString() || null,
        agent: t.agent ? { name: t.agent.name, role: t.agent.role } : null,
        tags: t.tags,
      }))

      const buffer = generateTasksPDF(serialized)
      return binaryResponse(buffer, "application/pdf", `tarefas-${Date.now()}.pdf`)
    }

    return NextResponse.json(
      { success: false, error: "Formato invalido. Use: json, csv, xlsx ou pdf" },
      { status: 400 }
    )
  } catch (error) {
    console.error("Erro ao exportar tarefas:", error)
    return NextResponse.json(
      { success: false, error: "Erro interno ao exportar tarefas" },
      { status: 500 }
    )
  }
}
