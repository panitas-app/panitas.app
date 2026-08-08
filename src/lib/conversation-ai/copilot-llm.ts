/**
 * Conversational AI Copilot (FASE 7B) — Proveedor LLM desacoplado.
 *
 * El copiloto funciona sin red con el proveedor heurístico determinista. Cuando
 * existe API key de IA configurada (NVIDIA NIM u OpenRouter), `createCopilotLlmProvider`
 * devuelve un proveedor que pule las respuestas y las consultas con datos anclados
 * (grounded). El servicio nunca depende del LLM: si falla, usa la heurística. El
 * conocimiento de los proveedores vive en agent-core (`createAgentAiProvider`).
 */
import type { AIProvider } from "@/lib/agent-core/providers/types"
import { createAgentAiProvider } from "@/lib/agent-core"
import type { CopilotQueryAnswer, CopilotSuggestion } from "./conversation-types"

/** Proveedor LLM opcional del copiloto (mejora; la heurística es el respaldo). */
export interface CopilotLlmProvider {
  readonly id: string
  /** Pule el contenido de una respuesta a consulta (mantiene los datos anclados). */
  refineQueryAnswer(draft: CopilotQueryAnswer, groundedContext: string): Promise<CopilotQueryAnswer>
  /** Pule el texto de las respuestas sugeridas (sin tocar los datos anclados). */
  refineSuggestions(suggestions: CopilotSuggestion[], groundedContext: string): Promise<CopilotSuggestion[]>
}

/** Proveedor determinista sin red: devuelve lo que recibe (default). */
export class HeuristicCopilotLlmProvider implements CopilotLlmProvider {
  readonly id = "heuristic"

  async refineQueryAnswer(draft: CopilotQueryAnswer): Promise<CopilotQueryAnswer> {
    return draft
  }

  async refineSuggestions(suggestions: CopilotSuggestion[]): Promise<CopilotSuggestion[]> {
    return suggestions
  }
}

const REFINE_RULES = "No agregues datos que no estén en el contexto. Mantén precios, montos, estados y nombres exactos. Responde en español, breve y con tono de vendedor amable."

/** Proveedor respaldado por la IA de agent-core (NVIDIA NIM u OpenRouter, sin acoplar al SDK). */
export class AgentCopilotLlmProvider implements CopilotLlmProvider {
  readonly id = "ai"

  constructor(private readonly provider: AIProvider) {}

  async refineQueryAnswer(draft: CopilotQueryAnswer, groundedContext: string): Promise<CopilotQueryAnswer> {
    const response = await this.provider.chat(
      [
        { role: "system", content: REFINE_RULES },
        {
          role: "user",
          content: `Contexto real (NO inventes nada fuera de aquí):\n${groundedContext}\n\nPregunta del usuario: ${draft.question}\n\nReformula la siguiente respuesta de forma natural, conservando los datos: "${draft.content}"`,
        },
      ],
      "reply_suggestion",
      { temperature: 0.4, maxTokens: 400 },
    )
    const content = response.content.trim()
    return content ? { ...draft, content } : draft
  }

  async refineSuggestions(suggestions: CopilotSuggestion[], groundedContext: string): Promise<CopilotSuggestion[]> {
    const sample = suggestions[0]
    if (!sample) return suggestions
    const response = await this.provider.chat(
      [
        { role: "system", content: REFINE_RULES },
        {
          role: "user",
          content: `Contexto real (NO inventes nada fuera de aquí):\n${groundedContext}\n\nDale un estilo más natural a esta respuesta sugerida, conservando todos los datos:\n"${sample.text}"`,
        },
      ],
      "reply_suggestion",
      { temperature: 0.5, maxTokens: 200 },
    )
    const text = response.content.trim()
    return text ? [{ ...sample, text }] : suggestions
  }
}

export interface CreateCopilotLlmProviderOptions {
  apiKey?: string
  agent?: Parameters<typeof createAgentAiProvider>[0]
}

/** Devuelve el proveedor LLM adecuado según configuración (sin key → heurístico). */
export function createCopilotLlmProvider(options: CreateCopilotLlmProviderOptions = {}): CopilotLlmProvider {
  const apiKey = options.apiKey ?? process.env.NVIDIA_NIM_API_KEY ?? process.env.OPENROUTER_API_KEY
  if (!apiKey?.trim()) return new HeuristicCopilotLlmProvider()
  return new AgentCopilotLlmProvider(createAgentAiProvider(options.agent))
}
