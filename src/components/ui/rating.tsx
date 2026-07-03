import { cn } from "@/lib/utils"
import { Star } from "lucide-react"

interface RatingProps {
  value: number
  max?: number
  size?: "sm" | "md" | "lg"
  showValue?: boolean
  className?: string
}

const sizeMap = {
  sm: "size-3",
  md: "size-4",
  lg: "size-5",
}

export function Rating({ value, max = 5, size = "sm", showValue, className }: RatingProps) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="flex">
        {Array.from({ length: max }, (_, i) => (
          <Star
            key={i}
            className={cn(
              sizeMap[size],
              i < Math.round(value) ? "fill-amber-400 text-amber-400" : "fill-muted text-muted-foreground/30"
            )}
          />
        ))}
      </div>
      {showValue && <span className="text-xs font-semibold text-muted-foreground">{value.toFixed(1)}</span>}
    </div>
  )
}
