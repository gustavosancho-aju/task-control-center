"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface SettingsSectionProps {
  title: string
  description: string
  children: React.ReactNode
  saving?: boolean
  className?: string
}

export function SettingsSection({
  title,
  description,
  children,
  saving = false,
  className,
}: SettingsSectionProps) {
  return (
    <Card className={cn("relative", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{title}</CardTitle>
          {saving && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Salvando...
            </div>
          )}
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  )
}
