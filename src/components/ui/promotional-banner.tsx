import { cn } from "@/lib/utils"
import { X, Sparkles } from "lucide-react"
import { useState } from "react"

interface PromotionalBannerProps {
  message: string
  cta?: { label: string; href: string }
  color?: string
  dismissable?: boolean
  className?: string
}

export function PromotionalBanner({ message, cta, color, dismissable = true, className }: PromotionalBannerProps) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <div
      className={cn(
        "relative flex items-center justify-center gap-3 px-4 py-2.5 text-sm font-medium",
        className
      )}
      style={color ? { backgroundColor: color } : { background: "linear-gradient(135deg, #FFB92E, #F59E0B)" }}
    >
      <Sparkles className="size-4 shrink-0 text-accent" />
      <span className="text-accent text-xs sm:text-sm">{message}</span>
      {cta && (
        <a
          href={cta.href}
          className="shrink-0 rounded-full bg-accent/20 px-3 py-1 text-xs font-bold text-accent hover:bg-accent/30 transition-colors"
        >
          {cta.label}
        </a>
      )}
      {dismissable && (
        <button
          onClick={() => setDismissed(true)}
          className="absolute right-2 text-accent/60 hover:text-accent transition-colors"
          aria-label="Cerrar"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  )
}
