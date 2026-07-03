export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + "..."
}

export function sanitizeJson(raw: string): string {
  return raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*$/g, "")
    .replace(/```/g, "")
    .trim()
}

export function safeParseJson<T>(raw: string): { data?: T; error?: string } {
  try {
    const cleaned = sanitizeJson(raw)
    const parsed = JSON.parse(cleaned) as T
    return { data: parsed }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "JSON inválido" }
  }
}

export function buildErrorResponse(message: string, status = 500) {
  return Response.json(
    { success: false, error: message },
    { status }
  )
}

export function buildSuccessResponse<T>(data: T) {
  return Response.json({ success: true, data })
}

export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  return "Error desconocido"
}

export function isStoreType(value: string): value is "productos" | "servicios" | "comida" | "citas" {
  return ["productos", "servicios", "comida", "citas"].includes(value)
}
