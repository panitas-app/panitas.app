import * as React from "react"

import { cn } from "@/lib/utils"

function Section({ className, ...props }: React.ComponentProps<"section">) {
  return (
    <section
      data-slot="section"
      className={cn("flex flex-col gap-4", className)}
      {...props}
    />
  )
}

function SectionHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="section-header"
      className={cn("flex flex-col gap-1", className)}
      {...props}
    />
  )
}

function SectionTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <h2
      data-slot="section-title"
      className={cn("font-heading text-lg font-bold text-foreground", className)}
      {...props}
    />
  )
}

function SectionDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="section-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export { Section, SectionDescription, SectionHeader, SectionTitle }
