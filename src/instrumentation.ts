export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { runBcvScheduler, getConfig } = await import("@/lib/bcv")
    const { getCurrentHourInTimezone, isWithinWindow } = await import("@/lib/bcv/config")

    async function tick() {
      const config = getConfig()
      const hour = getCurrentHourInTimezone(config.timezone)
      if (isWithinWindow(hour, config)) {
        console.log(`[BCV Cron] Dentro de ventana (${hour}h VET). Verificando tasa...`)
        const result = await runBcvScheduler("auto")
        console.log(`[BCV Cron] ${result.action}: ${result.message}`)
      }
    }

    // Run immediately, then every 30 minutes during the window
    await tick()
    setInterval(tick, 30 * 60 * 1000)
    console.log("[BCV Cron] Auto-scheduler iniciado (cada 30min, ventana 16-20h VET)")
  }
}
