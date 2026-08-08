/**
 * Action Detector (FASE 5D).
 *
 * Clasifica un mensaje en la acción conversacional más probable del catálogo.
 * Es determinista (sin LLM): hace scoring por señales (frases y palabras) y
 * desempata por especificidad. Si ninguna señal acierta, devuelve `null`
 * (el turno delega al flujo de inteligencia 4A / LLM).
 */
import type { ConversationalAction } from "./types"

export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

export interface DetectionMatch {
  action: ConversationalAction
  score: number
  hits: string[]
}

/** Detecta la acción más probable para un mensaje (o null). */
export function detectAction(actions: ConversationalAction[], message: string): DetectionMatch | null {
  const normalized = normalize(message)
  if (!normalized) return null

  let best: DetectionMatch | null = null
  for (const action of actions) {
    const hits: string[] = []
    let score = 0
    for (const signal of action.signals) {
      const target = normalize(signal)
      if (!target) continue
      if (normalized.includes(target)) {
        hits.push(signal)
        // Las frases (2+ palabras) pesan más que palabras sueltas.
        score += target.split(" ").length >= 2 ? 2 : 1
      }
    }
    if (score === 0) continue
    if (!best || score > best.score) {
      best = { action, score, hits }
    }
  }

  return best
}
