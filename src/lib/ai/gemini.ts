const apiKey = process.env.OPENROUTER_API_KEY
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
const SITE_NAME = "PanitasApp"

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
const DEFAULT_MODEL = "google/gemma-4-31b-it:free"
const DEFAULT_TIMEOUT = 30_000
const MAX_RETRIES = 2

export interface AiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  raw?: string
}

export interface AiGenerateOptions {
  prompt: string
  responseMimeType?: "application/json" | "text/plain"
  temperature?: number
  maxOutputTokens?: number
  systemInstruction?: string
  retries?: number
  timeout?: number
  model?: string
}

export async function generateJson<T>(
  prompt: string,
  schema?: Record<string, unknown>,
  options?: Partial<AiGenerateOptions>
): Promise<AiResponse<T>> {
  return generate<T>({
    prompt,
    responseMimeType: "application/json",
    ...(schema ? { systemInstruction: `Siempre responde SOLO con JSON válido que coincida con esta estructura: ${JSON.stringify(schema)}. No incluyas markdown, ni \`\`\`json, ni nada antes o después del JSON.` } : {}),
    ...options,
  })
}

export async function generateText(
  prompt: string,
  options?: Partial<AiGenerateOptions>
): Promise<AiResponse<string>> {
  return generate<string>({
    prompt,
    responseMimeType: "text/plain",
    ...options,
  })
}

async function generate<T>(
  options: AiGenerateOptions
): Promise<AiResponse<T>> {
  const {
    prompt,
    responseMimeType = "text/plain",
    temperature = 0.7,
    maxOutputTokens = 2048,
    systemInstruction,
    retries = MAX_RETRIES,
    timeout = DEFAULT_TIMEOUT,
    model = DEFAULT_MODEL,
  } = options

  if (!apiKey) {
    return { success: false, error: "OPENROUTER_API_KEY no está configurada en las variables de entorno" }
  }

  let lastError: string | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const messages: { role: string; content: string }[] = []

      if (systemInstruction) {
        messages.push({ role: "system", content: systemInstruction })
      }
      messages.push({ role: "user", content: prompt })

      const body: Record<string, unknown> = {
        model,
        messages,
        temperature,
        max_tokens: maxOutputTokens,
      }

      if (responseMimeType === "application/json") {
        body.response_format = { type: "json_object" }
      }

      const res = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": SITE_URL,
          "X-Title": SITE_NAME,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!res.ok) {
        const errBody = await res.text()
        let errMsg = `OpenRouter HTTP ${res.status}`
        try {
          const parsed = JSON.parse(errBody)
          errMsg = parsed.error?.message || parsed.error?.code || errMsg
        } catch {}
        lastError = errMsg
        console.error(`[OpenRouter] Intento ${attempt + 1}:`, errMsg)
        if (attempt < retries) continue
        break
      }

      const data = await res.json()
      const text = data?.choices?.[0]?.message?.content || ""

      if (!text.trim()) {
        lastError = "Respuesta vacía de la IA"
        if (attempt < retries) continue
        break
      }

      if (responseMimeType === "application/json") {
        try {
          const cleaned = text
            .replace(/```json\s*/gi, "")
            .replace(/```\s*$/g, "")
            .trim()
          const parsed = JSON.parse(cleaned) as T
          return { success: true, data: parsed, raw: text }
        } catch (parseErr) {
          lastError = `Error parseando JSON: ${parseErr instanceof Error ? parseErr.message : "error desconocido"}`
          if (attempt < retries) continue
          return { success: false, error: lastError, raw: text }
        }
      }

      return { success: true, data: text as T, raw: text }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error desconocido"
      console.error(`[OpenRouter] Intento ${attempt + 1} falló:`, message)
      lastError = message
      if (attempt >= retries) break
    }
  }

  return { success: false, error: lastError || "No se pudo generar contenido" }
}
