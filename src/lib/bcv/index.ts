import { prisma } from "@/lib/prisma"
import { runBcvScheduler } from "./scheduler"

export { runBcvScheduler }
export { fetchBcvRate } from "./fetcher"
export { getConfig } from "./config"
export type { BcvConfig } from "./config"
export type { SchedulerResult } from "./scheduler"

/**
 * Returns the latest effective BCV rate from the database.
 * This is a read-only function — it never fetches from external APIs.
 * The scheduler (cron) handles all external fetching.
 */
export async function getEffectiveRate(): Promise<number> {
  try {
    const latest = await prisma.bcvRate.findFirst({
      orderBy: { date: "desc" },
    })
    return latest?.rate || 0
  } catch {
    return 0
  }
}
