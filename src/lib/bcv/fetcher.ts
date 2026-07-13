export interface BcvFetchResult {
  rate: number
  publishedDate: string | null // ISO date string from the API
}

export async function fetchBcvRate(): Promise<BcvFetchResult> {
  // Primary source: dolarapi.com (most reliable, REST API)
  const dolarApi = await fetchFromDolarApi()
  if (dolarApi) return dolarApi

  // Fallback: pydolarve.org
  const py = await fetchFromPyDolarVe()
  if (py) return py

  // Last resort: official BCV website (web scraping)
  const official = await fetchFromBcvWebsite()
  if (official) return official

  throw new Error("All BCV rate sources failed")
}

/**
 * Scrapes the official BCV website for the USD exchange rate.
 * The rate appears as: <strong class="strong-tb">633,36440000</strong>
 * Uses comma as decimal separator (Venezuelan locale).
 * Uses https.get with rejectUnauthorized: false because BCV has a self-signed cert.
 */
async function fetchFromBcvWebsite(): Promise<BcvFetchResult | null> {
  try {
    const html = await httpsGet("https://www.bcv.org.ve/")

    // Find USD rate: <strong class="strong-tb">\d+,\d+</strong> inside the dolar row
    // Remove newlines to simulate dotall flag
    const singleLine = html.replace(/\n/g, " ")
    const usdMatch = singleLine.match(
      /<span>\s*USD\s*<\/span>.*?<strong[^>]*class="strong-tb"[^>]*>([\d.,]+)<\/strong>/,
    )
    if (!usdMatch) return null

    const raw = usdMatch[1].replace(/\./g, "").replace(",", ".")
    const rate = parseFloat(raw)
    if (!Number.isFinite(rate) || rate <= 0) return null

    // Extract the "Fecha Valor" date
    const dateMatch = html.match(
      /Fecha Valor:\s*<span[^>]*>([^<]+)<\/span>/,
    )
    const publishedDate = dateMatch ? dateMatch[1].trim() : null

    return { rate, publishedDate }
  } catch {
    return null
  }
}

/**
 * Makes an HTTPS GET request, returning the response body as text.
 * Rejects TLS errors (for BCV's self-signed certificate).
 */
async function httpsGet(url: string, timeout = 15000): Promise<string> {
  const https = await import("https")
  return new Promise((resolve, reject) => {
    const req = https.default.get(
      url,
      { rejectUnauthorized: false },
      (res) => {
        const chunks: Buffer[] = []
        res.on("data", (chunk: Buffer) => chunks.push(chunk))
        res.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")))
      },
    )
    req.on("error", reject)
    req.setTimeout(timeout, () => { req.destroy(); reject(new Error("Timeout")) })
  })
}

async function fetchFromDolarApi(): Promise<BcvFetchResult | null> {
  try {
    const res = await fetch("https://ve.dolarapi.com/v1/dolares/oficial", {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return null
    const data = await res.json()
    const rate = parseFloat(data.promedio)
    if (!Number.isFinite(rate) || rate <= 0) return null
    return {
      rate,
      publishedDate: data.fechaActualizacion || null,
    }
  } catch {
    return null
  }
}

async function fetchFromPyDolarVe(): Promise<BcvFetchResult | null> {
  try {
    const res = await fetch("https://pydolarve.org/api/v1/dollar?page=bcv", {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return null
    const data = await res.json()
    const rate = parseFloat(data.promedio)
    if (!Number.isFinite(rate) || rate <= 0) return null
    return {
      rate,
      publishedDate: data.fechaActualizacion || null,
    }
  } catch {
    return null
  }
}
