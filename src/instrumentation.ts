export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { runBcvScheduler } = await import("@/lib/bcv")

    async function tick() {
      console.log(`[BCV Cron] Verificando tasa...`)
      const result = await runBcvScheduler("auto", true)
      console.log(`[BCV Cron] ${result.action}: ${result.message}`)
    }

    await tick()
    setInterval(tick, 30 * 60 * 1000)
    console.log("[BCV Cron] Auto-scheduler iniciado (cada 30min)")
  }
}
