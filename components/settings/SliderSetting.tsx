"use client"

import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"

interface SliderSettingProps {
  id: string
  label: string
  description?: string
  value: number
  onValueChange: (value: number) => void
  min: number
  max: number
  step?: number
  unit?: string
  disabled?: boolean
}

export function SliderSetting({
  id,
  label,
  description,
  value,
  onValueChange,
  min,
  max,
  step = 1,
  unit = "",
  disabled = false,
}: SliderSettingProps) {
  return (
    <div className="space-y-3 py-2">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor={id} className="text-sm font-medium">
            {label}
          </Label>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        <span className="text-sm font-mono text-muted-foreground tabular-nums">
          {value}{unit}
        </span>
      </div>
      <Slider
        id={id}
        value={[value]}
        onValueChange={([v]) => onValueChange(v)}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
      />
    </div>
  )
}
