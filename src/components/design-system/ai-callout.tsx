import * as React from "react"
import {
  ChartColumn,
  CircleCheck,
  Lightbulb,
  Sparkles,
  TriangleAlert,
} from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const aiCalloutVariants = cva(
  "flex items-start gap-3 rounded-xl border p-4 text-sm",
  {
    variants: {
      variant: {
        insight: "border-accent/40 bg-accent/10 text-foreground",
        recommendation: "border-brand-primary/30 bg-brand-soft text-foreground",
        warning: "border-warning/40 bg-warning-soft text-foreground",
        success: "border-success/40 bg-success-soft text-foreground",
        data: "border-info/40 bg-info-soft text-foreground",
      },
    },
    defaultVariants: {
      variant: "insight",
    },
  }
)

const aiCalloutIcons = {
  insight: Lightbulb,
  recommendation: Sparkles,
  warning: TriangleAlert,
  success: CircleCheck,
  data: ChartColumn,
}

const aiCalloutIconColor = {
  insight: "text-accent-foreground",
  recommendation: "text-brand-primary",
  warning: "text-warning",
  success: "text-success",
  data: "text-info",
}

interface AICalloutProps
  extends Omit<React.ComponentProps<"div">, "title">,
    VariantProps<typeof aiCalloutVariants> {
  title?: React.ReactNode
}

function AICallout({
  className,
  variant = "insight",
  title,
  children,
  ...props
}: AICalloutProps) {
  const Icon = aiCalloutIcons[variant ?? "insight"]
  return (
    <div
      data-slot="ai-callout"
      className={cn(aiCalloutVariants({ variant }), className)}
      {...props}
    >
      <Icon
        className={cn(
          "mt-0.5 size-4 shrink-0",
          aiCalloutIconColor[variant ?? "insight"]
        )}
      />
      <div className="min-w-0 flex-1">
        {title ? (
          <p className="mb-0.5 text-sm font-medium text-foreground">{title}</p>
        ) : null}
        <div className="text-sm text-muted-foreground [&_p]:my-0">
          {children}
        </div>
      </div>
    </div>
  )
}

export { AICallout, aiCalloutVariants }
