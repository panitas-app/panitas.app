import { Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export function RecommendationBadge({
  count,
  className,
}: {
  count: number
  className?: string
}) {
  if (count <= 0) {
    return (
      <span
        className={cn(
          "inline-flex size-5 items-center justify-center rounded-full text-[10px] font-bold text-muted-foreground",
          className,
        )}
      >
        <Sparkles className="size-3.5" />
      </span>
    )
  }

  return (
    <Badge
      variant="secondary"
      className={cn("gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold", className)}
    >
      <Sparkles className="size-3" />
      {count}
    </Badge>
  )
}
