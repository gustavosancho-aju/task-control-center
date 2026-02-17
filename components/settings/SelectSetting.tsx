"use client"

import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface SelectOption {
  value: string
  label: string
}

interface SelectSettingProps {
  id: string
  label: string
  description?: string
  value: string
  onValueChange: (value: string) => void
  options: SelectOption[]
  disabled?: boolean
  placeholder?: string
}

export function SelectSetting({
  id,
  label,
  description,
  value,
  onValueChange,
  options,
  disabled = false,
  placeholder = "Selecionar...",
}: SelectSettingProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="space-y-0.5 flex-1">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className="w-40" id={id}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
