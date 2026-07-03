import { NextResponse } from "next/server"

const isProd = process.env.NODE_ENV === "production"

export function safeErrorResponse(error: unknown, fallback: string = "Error interno del servidor"): NextResponse {
  // Log full details server-side for debugging
  if (error instanceof Error) {
    console.error("[api error]", error.message, error.stack)
  } else {
    console.error("[api error]", error)
  }

  if (!isProd && error instanceof Error) {
    return NextResponse.json({ error: fallback, debug: error.message }, { status: 500 })
  }
  return NextResponse.json({ error: fallback }, { status: 500 })
}

export function jsonError(message: string, status: number = 400, extra?: Record<string, unknown>): NextResponse {
  return NextResponse.json({ error: message, ...(extra || {}) }, { status })
}
