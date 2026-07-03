import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

interface LoadingStateProps {
  message?: string
  className?: string
}

export function LoadingState({ message, className }: LoadingStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 py-20", className)}>
      <Loader2 className="size-8 animate-spin text-muted-foreground/50" />
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  )
}
