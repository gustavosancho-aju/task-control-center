import prisma from "@/lib/db"
import type { AuditAction } from "@prisma/client"
import { Prisma } from "@prisma/client"
import { headers } from "next/headers"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuditLogOptions {
  entityType: string
  entityId: string
  action: AuditAction
  changes?: Record<string, { from: unknown; to: unknown }> | null
  performedBy?: string
}

// ---------------------------------------------------------------------------
// Helper: extract IP and User-Agent from request headers
// ---------------------------------------------------------------------------

async function getRequestContext(): Promise<{ ipAddress: string | null; userAgent: string | null }> {
  try {
    const h = await headers()
    const ipAddress =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      h.get("x-real-ip") ||
      null
    const userAgent = h.get("user-agent") || null
    return { ipAddress, userAgent }
  } catch {
    return { ipAddress: null, userAgent: null }
  }
}

// ---------------------------------------------------------------------------
// Main audit logging function
// ---------------------------------------------------------------------------

export async function logAudit(options: AuditLogOptions) {
  const { entityType, entityId, action, changes = null, performedBy = "Usuário" } = options

  try {
    const { ipAddress, userAgent } = await getRequestContext()

    await prisma.auditLog.create({
      data: {
        entityType,
        entityId,
        action,
        changes: changes ? (changes as Prisma.InputJsonValue) : Prisma.JsonNull,
        performedBy,
        ipAddress,
        userAgent,
      },
    })
  } catch (error) {
    // Audit logging should never break the main operation
    console.error("Audit log error:", error)
  }
}

// ---------------------------------------------------------------------------
// Convenience functions
// ---------------------------------------------------------------------------

export function logTaskCreate(taskId: string, title: string) {
  return logAudit({
    entityType: "Task",
    entityId: taskId,
    action: "CREATE",
    changes: { title: { from: null, to: title } },
  })
}

export function logTaskUpdate(
  taskId: string,
  changes: Record<string, { from: unknown; to: unknown }>
) {
  return logAudit({
    entityType: "Task",
    entityId: taskId,
    action: "UPDATE",
    changes,
  })
}

export function logTaskDelete(taskId: string, title: string) {
  return logAudit({
    entityType: "Task",
    entityId: taskId,
    action: "DELETE",
    changes: { title: { from: title, to: null } },
  })
}

export function logTaskAssign(taskId: string, agentName: string | null, previousAgent: string | null) {
  return logAudit({
    entityType: "Task",
    entityId: taskId,
    action: "ASSIGN",
    changes: { agent: { from: previousAgent, to: agentName } },
  })
}

export function logTaskComplete(taskId: string, title: string) {
  return logAudit({
    entityType: "Task",
    entityId: taskId,
    action: "COMPLETE",
    changes: { title: { from: null, to: title }, status: { from: null, to: "DONE" } },
  })
}

export function logStatusChange(
  taskId: string,
  fromStatus: string,
  toStatus: string
) {
  return logAudit({
    entityType: "Task",
    entityId: taskId,
    action: "UPDATE",
    changes: { status: { from: fromStatus, to: toStatus } },
  })
}

export function logExecutionAction(
  executionId: string,
  action: "EXECUTE" | "UPDATE",
  details: Record<string, { from: unknown; to: unknown }>
) {
  return logAudit({
    entityType: "Execution",
    entityId: executionId,
    action,
    changes: details,
  })
}

export function logCommentCreate(commentId: string, taskId: string, authorName: string) {
  return logAudit({
    entityType: "Comment",
    entityId: commentId,
    action: "COMMENT",
    changes: { taskId: { from: null, to: taskId }, author: { from: null, to: authorName } },
  })
}

export function logAttachmentUpload(attachmentId: string, taskId: string, filename: string) {
  return logAudit({
    entityType: "Attachment",
    entityId: attachmentId,
    action: "UPLOAD",
    changes: { taskId: { from: null, to: taskId }, filename: { from: null, to: filename } },
  })
}

export function logAttachmentDelete(attachmentId: string, filename: string) {
  return logAudit({
    entityType: "Attachment",
    entityId: attachmentId,
    action: "DELETE",
    changes: { filename: { from: filename, to: null } },
  })
}
