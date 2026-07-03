import { prisma } from "@/lib/prisma"
import type { ComparisonResult } from "./comparator"

export interface UpdateResult {
  updated: boolean
  rate: number
}

/**
 * Updates the database with a new BCV rate if it has changed compared to
 * the latest stored record. If unchanged, only logs and returns the existing rate.
 */
export async function updateBcvRate(
  comparison: ComparisonResult,
  source: string,
): Promise<UpdateResult> {
  if (!comparison.changed) {
    console.log(
      `[BCV] No hubo cambios. Tasa actual: ${comparison.oldRate}. ` +
      `(publicada: ${comparison.newPublishedDate ?? "N/A"})`,
    )
    return { updated: false, rate: comparison.oldRate }
  }

  const record = await prisma.bcvRate.create({
    data: {
      rate: comparison.newRate,
      publishedDate: comparison.newPublishedDate
        ? new Date(comparison.newPublishedDate)
        : null,
      source,
    },
  })

  const now = new Date().toISOString()
  console.log(
    `[BCV] Tasa actualizada: ${comparison.oldRate} → ${comparison.newRate}. ` +
    `Fecha publicada: ${comparison.newPublishedDate ?? "N/A"}. ` +
    `Detectada: ${now}`,
  )

  return { updated: true, rate: record.rate }
}
