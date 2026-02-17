import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import prisma from '@/lib/db'
import { logAttachmentUpload } from '@/lib/audit/logger'

type RouteParams = { params: Promise<{ id: string }> }

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads')

const ALLOWED_MIME_TYPES = new Set([
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Text
  'text/plain',
  'text/csv',
  'text/markdown',
  'application/json',
  // Archives
  'application/zip',
  'application/x-rar-compressed',
  'application/gzip',
])

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

/**
 * GET /api/tasks/[id]/attachments — Lista anexos da tarefa
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const task = await prisma.task.findUnique({
      where: { id },
      select: { id: true },
    })
    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Tarefa não encontrada' },
        { status: 404 }
      )
    }

    const attachments = await prisma.attachment.findMany({
      where: { taskId: id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      success: true,
      data: attachments,
      total: attachments.length,
    })
  } catch (error) {
    console.error('GET /api/tasks/[id]/attachments error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar anexos' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/tasks/[id]/attachments — Upload de arquivo (multipart/form-data)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const task = await prisma.task.findUnique({
      where: { id },
      select: { id: true },
    })
    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Tarefa não encontrada' },
        { status: 404 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Nenhum arquivo enviado' },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'Arquivo excede o tamanho máximo de 10MB' },
        { status: 400 }
      )
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { success: false, error: `Tipo de arquivo não permitido: ${file.type}` },
        { status: 400 }
      )
    }

    // Ensure upload directory exists
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true })
    }

    // Generate unique filename
    const ext = path.extname(file.name) || ''
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    const safeBasename = file.name
      .replace(ext, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 50)
    const filename = `${timestamp}-${random}-${safeBasename}${ext}`

    // Write file to disk
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(path.join(UPLOAD_DIR, filename), buffer)

    // Create database record
    const uploadedBy = (formData.get('uploadedBy') as string) || 'Usuário'

    const attachment = await prisma.attachment.create({
      data: {
        taskId: id,
        filename,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        url: `/uploads/${filename}`,
        uploadedBy,
      },
    })

    logAttachmentUpload(attachment.id, id, attachment.originalName)

    return NextResponse.json({ success: true, data: attachment }, { status: 201 })
  } catch (error) {
    console.error('POST /api/tasks/[id]/attachments error:', error)
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { success: false, error: message || 'Erro ao fazer upload' },
      { status: 500 }
    )
  }
}
