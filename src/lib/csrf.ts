import { NextResponse } from "next/server"

function getAllowedOrigins(): Set<string> {
  const origins = [process.env.NEXTAUTH_URL].filter(Boolean) as string[]
  if (process.env.NODE_ENV === "development") {
    origins.push("http://localhost:3000")
  }
  return new Set(origins)
}

const MAX_BODY_SIZE = 1_000_000 // 1MB

function isSameOrigin(url: string, origin: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.origin === origin
  } catch {
    return false
  }
}

export function csrfGuard(request: Request): NextResponse | null {
  const method = request.method.toUpperCase()
  const isMutating = ["POST", "PUT", "PATCH", "DELETE"].includes(method)

  if (isMutating) {
    const origin = request.headers.get("origin")
    const referer = request.headers.get("referer")

    const origins = getAllowedOrigins()
    let allowed = false
    if (origin) {
      allowed = origins.has(origin)
    } else if (referer) {
      allowed = [...origins].some((o) => isSameOrigin(referer, o))
    }

    if (!allowed) {
      return NextResponse.json({ error: "CSRF: origen no válido" }, { status: 403 })
    }
  }

  const contentLength = request.headers.get("content-length")
  if (contentLength && parseInt(contentLength) > MAX_BODY_SIZE) {
    return NextResponse.json({ error: "El cuerpo de la solicitud es demasiado grande (máx 1MB)" }, { status: 413 })
  }

  return null
}

export async function enforceBodySize(request: Request, maxBytes: number = MAX_BODY_SIZE): Promise<NextResponse | null> {
  const contentLength = request.headers.get("content-length")
  if (contentLength) {
    const declared = parseInt(contentLength, 10)
    if (!Number.isNaN(declared) && declared > maxBytes) {
      return NextResponse.json({ error: `El cuerpo excede el límite de ${maxBytes} bytes` }, { status: 413 })
    }
    return null
  }

  try {
    const reader = request.body?.getReader()
    if (!reader) return null
    let total = 0
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      if (value) {
        total += value.byteLength
        if (total > maxBytes) {
          try { await reader.cancel() } catch (e) { console.error("[unhandled error]", e) }
          return NextResponse.json({ error: `El cuerpo excede el límite de ${maxBytes} bytes` }, { status: 413 })
        }
      }
    }
  } catch {
    // Streaming check is best-effort; rely on declared content-length when available
  }
  return null
}
