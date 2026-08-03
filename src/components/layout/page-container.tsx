import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/** Contenedor de ancho máximo para el contenido del dashboard (FASE 4F). */
export function PageContainer({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-6xl", className)}>{children}</div>
}
