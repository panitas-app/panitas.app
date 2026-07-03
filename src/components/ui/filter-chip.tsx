import { cn } from "@/lib/utils"
import { X } from "lucide-react"

interface FilterChipProps {
  label: string
  active?: boolean
  onClick?: () => void
  onRemove?: () => void
  className?: string
}

export function FilterChip({ label, active, onClick, onRemove, className }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all",
        active
          ? "bg-primary text-primary-foreground shadow-xs"
          : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80",
        className
      )}
    >
      {label}
      {active && onRemove && (
        <span onClick={(e) => { e.stopPropagation(); onRemove() }} className="ml-0.5 hover:opacity-70">
          <X className="size-3" />
        </span>
      )}
    </button>
  )
}
