import type { BcvRate } from "@prisma/client"

export interface ComparisonResult {
  changed: boolean
  oldRate: number
  newRate: number
  oldPublishedDate: Date | null
  newPublishedDate: string | null
}

/**
 * Compares a freshly fetched rate against the latest stored record.
 * Returns true only if the rate value differs (by more than 0.001).
 */
export function compareRates(
  latest: Pick<BcvRate, "rate" | "publishedDate"> | null,
  newRate: number,
  newPublishedDate: string | null,
): ComparisonResult {
  const oldRate = latest?.rate ?? 0
  const oldPublishedDate = latest?.publishedDate ?? null
  const changed = Math.abs(oldRate - newRate) > 0.001

  return {
    changed,
    oldRate,
    newRate,
    oldPublishedDate: oldPublishedDate ? new Date(oldPublishedDate) : null,
    newPublishedDate,
  }
}
