/**
 * Greeting Generator (FASE 5F) — bienvenida contextual del gerente virtual.
 *
 * Compone el saludo según la hora del día y la cantidad de hallazgos reales:
 *   - con hallazgos: "Buenos días, Juan. Revisé tu negocio y encontré 3 puntos
 *     para revisar." (variantes rotadas sin repetir),
 *   - sin hallazgos: saludo breve + pregunta, NUNCA "tu negocio está bien".
 *
 * La variedad es determinista: la plantilla se elige por hora y nombre, y no
 * repite la usada en el saludo anterior.
 */
import {
  FINDINGS_GREETING_TEMPLATES,
  NEUTRAL_GREETING_CLOSERS,
  assertPersonalitySafe,
  greetingPartOfDay,
  pickGreetingTemplateIndex,
  sanitizeAssistantText,
} from "./assistant-personality"
import type { AssistantGreeting } from "./types"

export interface GreetingOptions {
  userName?: string
  /** Hora local 0-23 (inyectable para pruebas). Default: hora actual. */
  hour?: number
  /** Cantidad real de hallazgos (nunca inventada). */
  findingsCount?: number
  /** Índice de plantilla del saludo anterior (para no repetir). */
  previousTemplateIndex?: number
  /** Fuerza usar un índice concreto (pruebas). */
  templateIndex?: number
}

/** Nombre bienvenida: con tilde capitalizada correctamente si viene en minúscula. */
function formatName(userName?: string): string | undefined {
  const name = userName?.trim()
  if (!name) return undefined
  return name.charAt(0).toUpperCase() + name.slice(1)
}

export function buildAssistantGreeting(options: GreetingOptions = {}): AssistantGreeting {
  const hour = options.hour ?? new Date().getHours()
  const name = formatName(options.userName)
  const partOfDay = greetingPartOfDay(hour)
  const withName = name ? `${partOfDay} ${name}` : partOfDay

  let text: string
  const findings = Math.max(0, options.findingsCount ?? 0)

  if (findings > 0) {
    const templateIndex =
      options.templateIndex ??
      pickGreetingTemplateIndex({ userName: name, hour, previousUsedIndex: options.previousTemplateIndex })
    const template = FINDINGS_GREETING_TEMPLATES[templateIndex] ?? FINDINGS_GREETING_TEMPLATES[0]
    const findingWord = findings === 1 ? "punto" : "puntos"
    const findingText = template.replace("{n}", String(findings)).replace("{w}", findingWord)
    text = `${withName}. ${findingText}`
  } else {
    const closer = NEUTRAL_GREETING_CLOSERS[Math.abs(hour) % NEUTRAL_GREETING_CLOSERS.length]
    text = `${withName}. ${closer}`
  }

  text = sanitizeAssistantText(text)
  assertPersonalitySafe(text)
  return { text, hour, userName: name }
}
