import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative w-full rounded-xl border px-4 py-3 text-sm [&>svg]:absolute [&>svg]:top-4 [&>svg]:left-4 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px]",
  {
    variants: {
      variant: {
        default: "border-border bg-background text-foreground [&>svg]:text-muted-foreground",
        info: "border-info/30 bg-info-soft text-foreground [&>svg]:text-info",
        success: "border-success/30 bg-success-soft text-foreground [&>svg]:text-success",
        warning: "border-warning/30 bg-warning-soft text-foreground [&>svg]:text-warning",
        destructive:
          "border-destructive/30 bg-destructive-soft text-foreground [&>svg]:text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn("text-sm font-medium leading-snug", className)}
      {...props}
    />
  )
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export { Alert, AlertDescription, AlertTitle, alertVariants }
