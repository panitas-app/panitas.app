#!/usr/bin/env node
/**
 * scripts/load-test.mjs — Smoke load test sin dependencias.
 *
 * Uso:
 *   node scripts/load-test.mjs [baseUrl] [duracionPorNivelMs] [nivelesConcurrencia]
 *
 * Ejemplos:
 *   node scripts/load-test.mjs http://localhost:3000 5000 10,50,100
 *   node scripts/load-test.mjs http://localhost:3000 3000 50
 *
 * Mide latencia (p50/p95/max), throughput y tasa de error sobre:
 *   /api/health/liveness  (sin dependencias)
 *   /api/health/readiness (con chequeo de BD)
 *   /                     (página pública)
 *
 * Salida exitosa (0) si la tasa de error <= 1% y p95 bajo umbral.
 */

const BASE_URL = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "")
const DURATION_MS = parseInt(process.argv[3] || "5000", 10)
const LEVELS = (process.argv[4] || "10,50,100")
  .split(",")
  .map((n) => parseInt(n.trim(), 10))
  .filter((n) => Number.isFinite(n) && n > 0)

const ENDPOINTS = [
  { name: "liveness", path: "/api/health/liveness" },
  { name: "readiness", path: "/api/health/readiness" },
  { name: "home", path: "/" },
]

const p95_THRESHOLD_MS = 1500
const ERROR_THRESHOLD = 0.01

function percentile(sorted, p) {
  if (sorted.length === 0) return 0
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)
  return sorted[Math.max(0, idx)]
}

async function hammer(baseUrl, path, concurrency, durationMs) {
  const latencies = []
  let ok = 0
  let errors = 0
  let active = 0
  const deadline = Date.now() + durationMs
  let stop = false

  async function worker() {
    while (!stop) {
      active++
      const start = Date.now()
      try {
        const res = await fetch(`${baseUrl}${path}`, { signal: AbortSignal.timeout(10_000) })
        const ms = Date.now() - start
        if (res.ok) ok++
        else errors++
        latencies.push(ms)
      } catch {
        errors++
        latencies.push(Date.now() - start)
      } finally {
        active--
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker())
  await new Promise((resolve) => setTimeout(resolve, durationMs))
  stop = true
  await Promise.all(workers)

  latencies.sort((a, b) => a - b)
  const total = ok + errors
  const rate = total / (durationMs / 1000)
  return {
    concurrency,
    total,
    ok,
    errors,
    rate: Math.round(rate * 10) / 10,
    p50: Math.round(percentile(latencies, 50)),
    p95: Math.round(percentile(latencies, 95)),
    max: latencies.length ? latencies[latencies.length - 1] : 0,
    errorRate: total ? errors / total : 1,
  }
}

let allPass = true

for (const level of LEVELS) {
  console.log(`\n── Concurrencia: ${level} (${DURATION_MS} ms) ──`)
  for (const ep of ENDPOINTS) {
    const r = await hammer(BASE_URL, ep.path, level, DURATION_MS)
    const errPct = (r.errorRate * 100).toFixed(2)
    const pass =
      r.errorRate <= ERROR_THRESHOLD && r.p95 <= p95_THRESHOLD_MS
    if (!pass) allPass = false
    console.log(
      `${ep.name.padEnd(10)} req=${String(r.total).padStart(5)} ok=${String(r.ok).padStart(5)} ` +
        `err=${errPct}% req/s=${String(r.rate).padStart(6)} p50=${r.p50}ms p95=${r.p95}ms max=${r.max}ms ${pass ? "PASS" : "FAIL"}`,
    )
  }
}

console.log(`\nRESULTADO: ${allPass ? "PASS" : "FAIL"}`)
process.exit(allPass ? 0 : 1)
