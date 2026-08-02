import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { getPanitasPlan, isPlusPlan } from "@/lib/feature-flags"

export function PlanBadge({
  planId,
  className,
}: {
  planId?: string | null
  className?: string
}) {
  const isPlus = isPlusPlan(planId)
  const plan = getPanitasPlan(planId)

  if (isPlus) {
    return (
      <Badge
        className={cn(
          "rounded-full border-transparent bg-brand px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-black shadow-sm shadow-brand/30",
          className,
        )}
      >
        Plus
      </Badge>
    )
  }

  return (
    <Badge
      variant="secondary"
      className={cn(
        "rounded-full border-transparent px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider",
        className,
      )}
    >
      {plan === "negocios_plus" ? "Negocios Plus" : "Negocios"}
    </Badge>
  )
}
