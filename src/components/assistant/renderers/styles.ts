import type { BlockTone } from "@/lib/conversational-actions"

/** Paleta por tono (FASE 5E): texto, fondo, borde y badge consistentes con el design system. */
export const TONE: Record<BlockTone, { text: string; bg: string; border: string; badge: string; ring: string }> = {
  default: {
    text: "text-foreground",
    bg: "bg-muted/40",
    border: "border-border",
    badge: "bg-secondary text-secondary-foreground",
    ring: "ring-border",
  },
  success: {
    text: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    badge: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    ring: "ring-emerald-500/40",
  },
  warning: {
    text: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    badge: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    ring: "ring-amber-500/40",
  },
  danger: {
    text: "text-red-600 dark:text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    badge: "bg-red-500/15 text-red-600 dark:text-red-400",
    ring: "ring-red-500/40",
  },
  info: {
    text: "text-sky-600 dark:text-sky-400",
    bg: "bg-sky-500/10",
    border: "border-sky-500/30",
    badge: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
    ring: "ring-sky-500/40",
  },
}

/** Formatea un valor numérico usando la moneda del negocio (Bs), fallback a texto. */
export function formatValue(value: string | number): string {
  if (typeof value === "number") {
    return new Intl.NumberFormat("es-VE", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value)
  }
  return value
}
