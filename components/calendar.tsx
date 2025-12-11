"use client"

import { Calendar } from "@/components/ui/calendar"
import { type Matcher } from "react-day-picker"
import { cn } from "@/lib/utils"

interface CalendarDemoProps {
  mode?: "single"
  selected?: Date | undefined
  onSelect?: (date: Date | undefined) => void
  disabled?: Matcher | Matcher[]
  className?: string
}

export function CalendarDemo({
  mode = "single",
  selected,
  onSelect,
  disabled,
  className,
}: CalendarDemoProps) {
  return (
    <Calendar
      mode={mode}
      selected={selected}
      onSelect={onSelect}
      disabled={disabled}
      className={cn("rounded-md border shadow", className)}
      captionLayout="dropdown"
    />
  )
}
