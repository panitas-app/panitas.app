const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
const MODEL = "nvidia/nemotron-3-ultra-550b-a55b:free"
const MAX_DAILY_REQUESTS = 100

interface AIProduct {
  name: string
  price: number
  costPrice: number | null
  stock: number
  sku: string | null
  description: string | null
  category: string | null
  unidadBase: string
  isActive: boolean
}

interface AIResponse {
  products: AIProduct[]
  errors: string[]
}

// Simple daily counter (in-memory, resets on server restart)
let dailyCount = 0
let lastResetDate = ""

function checkDailyLimit(): boolean {
  const today = new Date().toISOString().split("T")[0]
  if (today !== lastResetDate) {
    dailyCount = 0
    lastResetDate = today
  }
  return dailyCount < MAX_DAILY_REQUESTS
}

function incrementDailyCount(): void {
  dailyCount++
}

export function getDailyUsage(): { used: number; limit: number } {
  const today = new Date().toISOString().split("T")[0]
  if (today !== lastResetDate) {
    return { used: 0, limit: MAX_DAILY_REQUESTS }
  }
  return { used: dailyCount, limit: MAX_DAILY_REQUESTS }
}

export async function parseInventoryWithAI(rawRows: (string | number | null)[][]): Promise<AIResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return { products: [], errors: ["OPENROUTER_API_KEY no está configurada. Contacta al administrador."] }
  }

  if (!checkDailyLimit()) {
    return { products: [], errors: [`Límite diario de ${MAX_DAILY_REQUESTS} análisis con IA alcanzado. Intenta de mañana o usa el mapeo manual.`] }
  }

  // Format rows as tab-separated text for the AI
  const rowsText = rawRows
    .filter((row) => row.some((cell) => cell !== null && cell !== undefined && cell !== ""))
    .map((row, i) => `${i + 1}\t${row.map((c) => (c === null || c === undefined ? "" : String(c))).join("\t")}`)
    .join("\n")

  const prompt = `You are an inventory parser. You receive raw rows from a spreadsheet inventory file.
Each row starts with a row number followed by tab-separated cell values.

Your task: Extract ALL products and return a valid JSON object.

RULES:
1. SKIP rows that are metadata (business name, address, phone, "Inventario", etc.)
2. SKIP empty rows (all cells empty/null)
3. SKIP rows that are category headers (single text in first column, rest empty — these are category names, use them as the current category)
4. Product rows typically have: description/name, stock quantity, cost price, selling price
5. Column order varies — detect which column is which by content:
   - Text with uppercase letters and specs = product name/description
   - Numbers with 1-3 decimals = prices (cost or selling)
   - Integers = stock quantity
6. If you see a category header row, set that as the current category for subsequent products
7. Parse prices: remove $, Bs., commas. "15,50" → 15.50. "$0.25" → 0.25
8. Stock = integer. If 0 or empty, use 0
9. The category field should be the most recent category header above the product
10. Return "Unidad" as unidadBase for all products
11. Set isActive: true for all products

RETURN FORMAT (valid JSON only, no markdown, no explanation):
{
  "products": [
    {
      "name": "PRODUCT NAME",
      "price": 1.50,
      "costPrice": 0.25,
      "stock": 10,
      "sku": null,
      "description": null,
      "category": "CATEGORY NAME",
      "unidadBase": "Unidad",
      "isActive": true
    }
  ]
}

RAW INVENTORY DATA:
${rowsText}`

  incrementDailyCount()

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://panitas.app",
        "X-OpenRouter-Title": "Panitas Inventory Import",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: "You are an expert inventory data parser. Always return valid JSON only, no markdown code blocks, no explanations." },
          { role: "user", content: prompt },
        ],
        max_tokens: 16000,
        temperature: 0.1,
      }),
    })

    if (!response.ok) {
      const errBody = await response.text()
      console.error("[AI] OpenRouter error:", response.status, errBody)
      return { products: [], errors: [`Error de la API de IA (${response.status}). Intenta de nuevo o usa el mapeo manual.`] }
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) {
      return { products: [], errors: ["La IA no devolvió resultados. Intenta de nuevo."] }
    }

    // Parse JSON from response (handle markdown code blocks)
    let jsonStr = content.trim()
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "")
    }

    let parsed: { products?: AIProduct[] }
    try {
      parsed = JSON.parse(jsonStr)
    } catch {
      // Try to extract JSON from the response
      const match = jsonStr.match(/\{[\s\S]*\}/)
      if (match) {
        parsed = JSON.parse(match[0])
      } else {
        return { products: [], errors: ["No se pudo interpretar la respuesta de la IA. Usa el mapeo manual."] }
      }
    }

    const products = parsed.products || []

    // Validate and sanitize each product
    const validated: AIProduct[] = []
    const errors: string[] = []

    for (let i = 0; i < products.length; i++) {
      const p = products[i]
      if (!p.name || typeof p.name !== "string" || p.name.trim().length < 1) {
        errors.push(`Producto ${i + 1}: nombre faltante`)
        continue
      }
      if (typeof p.price !== "number" || p.price <= 0) {
        errors.push(`Producto "${p.name.slice(0, 30)}": precio inválido (${p.price})`)
        continue
      }
      validated.push({
        name: p.name.trim().slice(0, 200),
        price: Math.round(p.price * 100) / 100,
        costPrice: typeof p.costPrice === "number" && p.costPrice >= 0 ? Math.round(p.costPrice * 100) / 100 : null,
        stock: typeof p.stock === "number" && p.stock >= 0 ? Math.round(p.stock) : 0,
        sku: typeof p.sku === "string" && p.sku.trim().length > 0 ? p.sku.trim().slice(0, 32) : null,
        description: typeof p.description === "string" ? p.description.trim().slice(0, 5000) : null,
        category: typeof p.category === "string" && p.category.trim().length > 0 ? p.category.trim() : null,
        unidadBase: "Unidad",
        isActive: true,
      })
    }

    return { products: validated, errors }
  } catch (e) {
    console.error("[AI] parseInventoryWithAI error:", e)
    return { products: [], errors: ["Error al conectar con la IA. Verifica tu conexión e intenta de nuevo."] }
  }
}
