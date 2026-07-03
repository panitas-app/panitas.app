const rateMap = new Map<string, { count: number; resetTime: number }>()

// Garbage Collector: Sweeps expired keys every 10 minutes to prevent memory leaks (OOM)
if (typeof globalThis !== "undefined") {
  const globalForInterval = globalThis as unknown as { rateLimitCleanupInterval?: NodeJS.Timeout }
  if (!globalForInterval.rateLimitCleanupInterval) {
    globalForInterval.rateLimitCleanupInterval = setInterval(() => {
      const now = Date.now()
      for (const [key, record] of rateMap.entries()) {
        if (now > record.resetTime) {
          rateMap.delete(key)
        }
      }
    }, 10 * 60 * 1000) // 10 minutes

    // Unref ensures node processes and automated test runners exit cleanly
    globalForInterval.rateLimitCleanupInterval.unref?.()
  }
}

export async function rateLimit(
  key: string,
  maxAttempts: number = 5,
  windowMs: number = 60 * 1000
): Promise<{ success: boolean; remaining: number; resetIn: number }> {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

  if (redisUrl && redisToken) {
    try {
      const redisKey = `panitas:rate:${key}`
      const res = await fetch(`${redisUrl}/pipeline`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${redisToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          ["INCR", redisKey],
          ["TTL", redisKey],
        ]),
        // Low timeout so we fall back quickly if Upstash is experiencing latency
        signal: AbortSignal.timeout(2000),
      })

      if (res.ok) {
        const data = await res.json()
        const count = parseInt(data[0]?.result || "1")
        let ttl = parseInt(data[1]?.result || "-1")

        // If key has no expire set (new key), define the window TTL
        if (ttl < 0) {
          const windowSec = Math.ceil(windowMs / 1000)
          await fetch(`${redisUrl}/EXPIRE/${redisKey}/${windowSec}`, {
            method: "GET",
            headers: { Authorization: `Bearer ${redisToken}` },
            signal: AbortSignal.timeout(1000),
          }).catch(() => {})
          ttl = windowSec
        }

        if (count > maxAttempts) {
          return { success: false, remaining: 0, resetIn: ttl * 1000 }
        }

        return { success: true, remaining: maxAttempts - count, resetIn: ttl * 1000 }
      }
    } catch (e) {
      console.warn("Upstash Redis rate limiter failed, falling back to in-memory:", e)
    }
  }

  // Fallback local memory rate limiter
  const now = Date.now()
  const record = rateMap.get(key)

  if (!record || now > record.resetTime) {
    rateMap.set(key, { count: 1, resetTime: now + windowMs })
    return { success: true, remaining: maxAttempts - 1, resetIn: windowMs }
  }

  if (record.count >= maxAttempts) {
    return { success: false, remaining: 0, resetIn: record.resetTime - now }
  }

  record.count++
  return { success: true, remaining: maxAttempts - record.count, resetIn: record.resetTime - now }
}

export function getClientIp(request: Request): string {
  const forwarded = (request.headers as Headers).get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0].trim()
  return "127.0.0.1"
}
