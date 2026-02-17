"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Download, FileSpreadsheet, FileText, FileJson, Loader2 } from "lucide-react"
import { notifySuccess, notifyError } from "@/lib/notifications"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ExportFormat = "json" | "csv" | "xlsx" | "pdf"

interface ExportButtonProps {
  /** API endpoint to call (e.g. "/api/export/tasks" or "/api/export/report") */
  endpoint: string
  /** Additional query params to append (e.g. filters) */
  queryParams?: Record<string, string>
  /** Allowed formats to show in dropdown */
  formats?: ExportFormat[]
  /** Label override */
  label?: string
  /** Button variant */
  variant?: "default" | "outline" | "ghost" | "secondary"
  /** Button size */
  size?: "default" | "sm" | "lg" | "icon"
}

// ---------------------------------------------------------------------------
// Format config
// ---------------------------------------------------------------------------

const FORMAT_CONFIG: Record<ExportFormat, { label: string; icon: typeof Download; ext: string }> = {
  json: { label: "JSON", icon: FileJson, ext: "json" },
  csv: { label: "CSV", icon: FileText, ext: "csv" },
  xlsx: { label: "Excel (XLSX)", icon: FileSpreadsheet, ext: "xlsx" },
  pdf: { label: "PDF", icon: FileText, ext: "pdf" },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ExportButton({
  endpoint,
  queryParams = {},
  formats = ["json", "csv", "xlsx", "pdf"],
  label = "Exportar",
  variant = "outline",
  size = "default",
}: ExportButtonProps) {
  const [loading, setLoading] = useState(false)
  const [activeFormat, setActiveFormat] = useState<ExportFormat | null>(null)

  const handleExport = async (format: ExportFormat) => {
    setLoading(true)
    setActiveFormat(format)

    try {
      const params = new URLSearchParams({ format, ...queryParams })
      const url = `${endpoint}?${params.toString()}`

      const res = await fetch(url)

      if (!res.ok) {
        const errorData = await res.json().catch(() => null)
        throw new Error(errorData?.error || "Erro ao exportar")
      }

      // For JSON, just download the response as a file
      if (format === "json") {
        const data = await res.json()
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
        downloadBlob(blob, `export-${Date.now()}.json`)
      } else {
        const blob = await res.blob()
        const ext = FORMAT_CONFIG[format].ext
        downloadBlob(blob, `export-${Date.now()}.${ext}`)
      }

      notifySuccess("Exportacao concluida", `Arquivo ${FORMAT_CONFIG[format].label} gerado com sucesso.`)
    } catch (err) {
      console.error("Export error:", err)
      notifyError(
        "Erro na exportacao",
        err instanceof Error ? err.message : "Ocorreu um erro ao exportar os dados."
      )
    } finally {
      setLoading(false)
      setActiveFormat(null)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className="gap-2" disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {formats.map((format, i) => {
          const config = FORMAT_CONFIG[format]
          const Icon = config.icon
          const isActive = activeFormat === format

          return (
            <div key={format}>
              {i > 0 && format === "pdf" && <DropdownMenuSeparator />}
              <DropdownMenuItem
                onClick={() => handleExport(format)}
                disabled={loading}
                className="gap-2 cursor-pointer"
              >
                {isActive ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
                {config.label}
              </DropdownMenuItem>
            </div>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ---------------------------------------------------------------------------
// Utils
// ---------------------------------------------------------------------------

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
