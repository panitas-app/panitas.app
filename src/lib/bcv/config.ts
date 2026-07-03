export interface BcvConfig {
  timezone: string
  monitorStartHour: number
  monitorEndHour: number
  queryIntervalHours: number
}

export function getConfig(): BcvConfig {
  return {
    timezone: process.env.BCV_TIMEZONE || "America/Caracas",
    monitorStartHour: parseInt(process.env.BCV_MONITOR_START_HOUR || "16", 10),
    monitorEndHour: parseInt(process.env.BCV_MONITOR_END_HOUR || "20", 10),
    queryIntervalHours: parseInt(process.env.BCV_QUERY_INTERVAL_HOURS || "1", 10),
  }
}

function formatterInTimezone(tz: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, ...options })
}

/**
 * Returns the current hour in the configured timezone (0-23).
 */
export function getCurrentHourInTimezone(tz: string): number {
  return parseInt(formatterInTimezone(tz, { hour: "numeric", hour12: false }).format(new Date()), 10)
}

/**
 * Returns the current date string (YYYY-MM-DD) in the configured timezone.
 */
export function getCurrentDateInTimezone(tz: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}

/**
 * Returns a Date set to midnight (00:00:00.000) of today in the given timezone.
 * This can be used directly in Prisma queries against DateTime fields.
 */
export function getTodayStartInTimezone(tz: string): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    hour12: false,
  }).formatToParts(new Date())

  const year = parseInt(parts.find((p) => p.type === "year")!.value, 10)
  const month = parseInt(parts.find((p) => p.type === "month")!.value, 10) - 1
  const day = parseInt(parts.find((p) => p.type === "day")!.value, 10)

  return new Date(year, month, day, 0, 0, 0, 0)
}

/**
 * Returns true if the given hour is within the monitoring window.
 */
export function isWithinWindow(hour: number, config: BcvConfig): boolean {
  return hour >= config.monitorStartHour && hour <= config.monitorEndHour
}
