import { prisma } from "@/lib/prisma"
import { getConfig, getCurrentHourInTimezone, isWithinWindow } from "./config"
import { fetchBcvRate } from "./fetcher"
import { compareRates } from "./comparator"
import { updateBcvRate } from "./updater"

export interface SchedulerResult {
  action: "skipped_outside_window" | "fetch_error" | "updated" | "no_change"
  rate?: number
  message: string
}

/**
 * Main scheduler entry point. Should be called by the cron endpoint.
 *
 * Rules:
 * 1. If outside the monitoring window (4-8 PM VET) → skip
 * 2. Fetch from source
 * 3. Compare with latest DB record
 * 4. If changed → update DB
 * 5. If unchanged → log and allow next query
 */
export async function runBcvScheduler(source = "scheduler", force = false): Promise<SchedulerResult> {
  const config = getConfig()
  const currentHour = getCurrentHourInTimezone(config.timezone)

  // ─── Rule 1: Outside monitoring window (skip unless forced) ───
  if (!force && !isWithinWindow(currentHour, config)) {
    return {
      action: "skipped_outside_window",
      message: `Fuera de ventana (${currentHour}h). Ventana: ${config.monitorStartHour}h - ${config.monitorEndHour}h ${config.timezone}`,
    }
  }

  // ─── Rule 2: Fetch from source ───
  let fetchResult
  try {
    fetchResult = await fetchBcvRate()
  } catch (error) {
    console.error("[BCV] Error al consultar fuente:", error)
    const latest = await prisma.bcvRate.findFirst({ orderBy: { date: "desc" } })
    return {
      action: "fetch_error",
      rate: latest?.rate || 0,
      message: `Error al consultar fuente. Se mantiene última tasa válida: ${latest?.rate ?? "N/A"}`,
    }
  }

  if (!fetchResult || !Number.isFinite(fetchResult.rate) || fetchResult.rate <= 0) {
    const latest = await prisma.bcvRate.findFirst({ orderBy: { date: "desc" } })
    return {
      action: "fetch_error",
      rate: latest?.rate || 0,
      message: `Datos inválidos desde la fuente. Se mantiene última tasa: ${latest?.rate ?? "N/A"}`,
    }
  }

  // ─── Rule 3: Compare with latest DB record ───
  const latest = await prisma.bcvRate.findFirst({ orderBy: { date: "desc" } })
  const comparison = compareRates(latest, fetchResult.rate, fetchResult.publishedDate)

  // ─── Rule 4 & 5: Update or log no-change ───
  const result = await updateBcvRate(comparison, source)

  if (result.updated) {
    return {
      action: "updated",
      rate: result.rate,
      message: `Tasa actualizada: ${comparison.oldRate} → ${comparison.newRate}`,
    }
  }

  return {
    action: "no_change",
    rate: result.rate,
    message: `Sin cambios. Tasa vigente: ${result.rate}`,
  }
}
