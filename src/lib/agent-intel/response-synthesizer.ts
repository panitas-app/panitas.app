/**
 * Response Synthesizer (FASE 4A).
 *
 * Combina los resultados de las herramientas, el contexto del negocio, la
 * memoria y las explicaciones en el material final de respuesta.
 *
 * En producción el LLM del Agent Core genera la respuesta final a partir de
 * `synthesizedContext` (inyectado en el system prompt). También ofrece un
 * fallback determinista (`buildFallbackReply`) para cuando no hay LLM
 * (confirmaciones o degradación), garantizando que el usuario siempre reciba
 * una respuesta coherente y legible.
 */
import type { SynthesisInput, StepExecutionResult } from "./types"
import { sanitizeAssistantReply } from "@/lib/conversational"

export interface ResponseSynthesizerOptions {
  /** Máximo de caracteres por resultado de tool inyectado al LLM. */
  maxResultChars?: number
}

const DEFAULT_MAX = 1200

function truncate(value: unknown, max: number): string {
  const text = typeof value === "string" ? value : JSON.stringify(value)
  if (!text) return "—"
  return text.length > max ? `${text.slice(0, max)}…` : text
}

export class ResponseSynthesizer {
  private readonly maxResultChars: number

  constructor(options: ResponseSynthesizerOptions = {}) {
    this.maxResultChars = options.maxResultChars ?? DEFAULT_MAX
  }

  /** Fragmento de contexto para el LLM del Agent Core. */
  buildPromptContext(input: SynthesisInput): string {
    const lines: string[] = []

    lines.push(`INTENCION_DETECTADA: ${input.intent.type} (confianza ${Math.round(input.intent.confidence * 100)}%)`)
    if (input.intent.domains.length > 0) {
      lines.push(`DOMINIOS: ${input.intent.domains.join(", ")}`)
    }

    if (input.plan && input.plan.steps.length > 0) {
      lines.push("PLAN_EJECUTADO:")
      for (const step of input.plan.steps) {
        lines.push(`  - ${step.tool}${step.requiresConfirmation ? " [requiere confirmacion]" : ""}`)
      }
    }

    if (input.results.length > 0) {
      lines.push("RESULTADOS_DE_HERRAMIENTAS:")
      for (const r of input.results) {
        const status = r.status === "ok" ? "ok" : r.status
        if (r.status === "ok" && r.output) {
          lines.push(`  [${r.tool}] (${status}): ${truncate(r.output.data, this.maxResultChars)}`)
        } else if (r.status === "error") {
          lines.push(`  [${r.tool}] (error): ${r.error ?? "fallo desconocido"}`)
        } else {
          lines.push(`  [${r.tool}] (${status})`)
        }
      }
    }

    if (input.explanations && input.explanations.length > 0) {
      lines.push("EXPLICACIONES:")
      for (const explanation of input.explanations) {
        lines.push(`  - ${explanation}`)
      }
    }

    if (input.businessContext) {
      lines.push(`CONTEXTO_DE_NEGOCIO:\n${truncate(input.businessContext, this.maxResultChars)}`)
    }
    if (input.memoryContext) {
      lines.push(`MEMORIA_RELEVANTE:\n${truncate(input.memoryContext, this.maxResultChars)}`)
    }

    lines.push(
      "Instruccion: responde al usuario en espanol, de forma clara y natural, " +
        "basandote en los resultados de las herramientas. Si algo fallo, dilo y sugiere el siguiente paso."
    )

    return lines.join("\n")
  }

  /** Respuesta determinista sin LLM (confirmaciones o degradación), en lenguaje natural. */
  buildFallbackReply(input: SynthesisInput): string {
    const okResults = input.results.filter((r) => r.status === "ok")
    const errorResults = input.results.filter((r) => r.status === "error")

    if (okResults.length === 0) {
      if (errorResults.length === 0) {
        return "No pude entender bien tu solicitud. ¿Puedes reformularla?"
      }
      return `No pude completar la acción. ${this.describeErrors(errorResults)}`
    }

    const summary: string[] = []
    for (const r of okResults) {
      summary.push(this.describeResult(r))
    }

    let reply = summary.join("\n")
    if (errorResults.length > 0) {
      reply += `\n\nNota: ${this.describeErrors(errorResults)}`
    }
    return reply
  }

  private describeResult(result: StepExecutionResult): string {
    const data = result.output?.data
    if (data === null || data === undefined) return "Se completó la acción correctamente."
    return this.describeItem(data)
  }

  /** Describe un resultado en lenguaje natural, sin nombres internos ni JSON. */
  private describeItem(item: unknown): string {
    if (item === null || item === undefined) return "Elemento encontrado."
    if (typeof item === "string" || typeof item === "number" || typeof item === "boolean") return String(item)

    if (Array.isArray(item)) {
      if (item.length === 0) return "No se encontraron resultados para tu consulta."
      const lines = item.slice(0, 5).map((entry) => this.describeItem(entry))
      const more = item.length > 5 ? `\nY ${item.length - 5} resultado(s) más.` : ""
      return lines.join("\n") + more
    }

    if (typeof item === "object") {
      const obj = item as Record<string, unknown>
      const name =
        typeof obj.name === "string" && obj.name.trim()
          ? obj.name.trim()
          : typeof obj.title === "string" && obj.title.trim()
            ? obj.title.trim()
            : ""
      const bits: string[] = []
      if (name) bits.push(name)
      const push = (label: string, value: unknown) => {
        if (value !== undefined && value !== null && value !== "") bits.push(`${label}: ${value}`)
      }
      push("Precio", typeof obj.price === "number" ? `Bs. ${obj.price}` : undefined)
      push("Stock", typeof obj.stock === "number" ? `${obj.stock}` : undefined)
      push("Cantidad", typeof obj.quantity === "number" ? `${obj.quantity}` : undefined)
      push("Total", typeof obj.total === "number" ? `${obj.total}` : undefined)
      push("Ventas", typeof obj.ventas === "number" ? `${obj.ventas}` : undefined)
      push("Estado", typeof obj.status === "string" ? obj.status : undefined)
      push("Producto", typeof obj.product === "string" ? obj.product : undefined)
      push("Cliente", typeof obj.customer === "string" ? obj.customer : undefined)
      if (bits.length > 0) return bits.join(" — ")
      return "Encontré la información que buscabas."
    }

    return String(item)
  }

  private describeErrors(results: StepExecutionResult[]): string {
    const first = results[0]
    if (results.length === 1) {
      const err = sanitizeAssistantReply(first.error ?? "").trim()
      if (!err) return "No se pudo obtener toda la información."
      if (/timeout|tarde|time.?out/i.test(err)) return "Tardé demasiado en obtener la información."
      if (/not found|no se encontro|no existe/i.test(err)) return "No encontré la información solicitada."
      if (/sin permisos|denied|denegado/i.test(err)) return "No tengo permisos para hacer esa acción."
      if (err.length <= 80) return err
      return "No se pudo obtener toda la información."
    }
    return `Se presentaron ${results.length} problemas al obtener la información.`
  }
}
