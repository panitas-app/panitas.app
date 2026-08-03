"use client"

import { RecommendationsSection } from "@/components/recommendations/recommendations-section"

/**
 * Vista previa de insights (Panitas Home) — FASE 4F.
 * Máximo 3 recomendaciones visibles con opción de expandir "Ver todas".
 * Reutiliza el motor de recomendaciones (FASE 4D).
 */
export function InsightPreview({ className }: { className?: string }) {
  return <RecommendationsSection limit={3} title="Insights de Panitas" className={className} />
}
