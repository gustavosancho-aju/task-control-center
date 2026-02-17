import { NextRequest, NextResponse } from 'next/server'
import { readFile, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import prisma from '@/lib/db'

type RouteParams = { params: Promise<{ id: string }> }

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads')

/**
 * GET /api/attachments/[id] — Download do arquivo
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const attachment = await prisma.attachment.findUnique({
      where: { id },
    })
    if (!attachment) {
      return NextResponse.json(
        { success: false, error: 'Anexo não encontrado' },
        { status: 404 }
      )
    }

    const filePath = path.join(UPLOAD_DIR, attachment.filename)

    if (!existsSync(filePath)) {
      return NextResponse.json(
        { success: false, error: 'Arquivo não encontrado no servidor' },
        { status: 404 }
      )
    }

    const fileBuffer = await readFile(filePath)

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': attachment.mimeType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(attachment.originalName)}"`,
        'Content-Length': String(attachment.size),
      },
    })
  } catch (error) {
    console.error('GET /api/attachments/[id] error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao baixar arquivo' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/attachments/[id] — Remove arquivo e registro
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const attachment = await prisma.attachment.findUnique({
      where: { id },
    })
    if (!attachment) {
      return NextResponse.json(
        { success: false, error: 'Anexo não encontrado' },
        { status: 404 }
      )
    }

    // Delete file from disk
    const filePath = path.join(UPLOAD_DIR, attachment.filename)
    if (existsSync(filePath)) {
      await unlink(filePath)
    }

    // Delete database record
    await prisma.attachment.delete({ where: { id } })

    return NextResponse.json({ success: true, message: 'Anexo removido com sucesso' })
  } catch (error) {
    console.error('DELETE /api/attachments/[id] error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao remover anexo' },
      { status: 500 }
    )
  }
}
