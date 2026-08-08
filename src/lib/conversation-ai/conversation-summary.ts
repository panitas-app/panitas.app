/**
 * Conversational AI Copilot (FASE 7B) — Resumen automático.
 *
 * Genera un resumen corto y verificable de la conversación usando solo los
 * mensajes reales: intención detectada, dato del cliente y último mensaje.
 * Soporta actualización incremental: si solo llegaron mensajes nuevos desde
 * el último resumen, fusiona hechos sin reprocesar el historial completo.
 */
import type { InboxMessageDTO } from "@/lib/inbox/conversation-types"
import { COPILOT_INTENT_LABELS, type CopilotIntent, type CopilotSummary } from "./conversation-types"
import { detectConversationIntent } from "./intent-detector"

export interface SummaryContext {
  customerName?: string | null
}

function customerMessages(messages: InboxMessageDTO[]): InboxMessageDTO[] {
  return messages.filter((m) => m.sender === "customer")
}

function lastCustomerContent(messages: InboxMessageDTO[]): string {
  const customers = customerMessages(messages)
  return customers[customers.length - 1]?.content ?? ""
}

function clean(text: string, max = 90): string {
  return text.replace(/\s+/g, " ").trim().slice(0, max)
}

function factOf(message: InboxMessageDTO | undefined): string {
  if (!message) return ""
  const prefix = message.sender === "customer" ? "El cliente dijo" : "La tienda dijo"
  const body = clean(message.content, 80)
  return body ? `${prefix}: "${body}"` : ""
}

function intentLabel(intents: CopilotIntent[]): string {
  if (intents.length === 0) return "sin intención clara"
  return intents.map((i) => COPILOT_INTENT_LABELS[i]).join(", ")
}

function summarize(messages: InboxMessageDTO[], customerName: string | null): Omit<CopilotSummary, "lastMessageId" | "updatedAt"> {
  const intent = detectConversationIntent(messages)
  const last = customerMessages(messages).slice(-1)[0]
  const who = customerName?.trim()
  const subject = who ? `el cliente ${who}` : "el cliente"
  const facts: string[] = []
  const lastFact = factOf(last)
  if (lastFact) facts.push(lastFact)
  if (intent.intents.length > 0) facts.push(`Intención: ${intentLabel(intent.intents)}`)

  let text: string
  if (messages.length === 0) {
    text = "La conversación todavía no tiene mensajes."
  } else if (messages.length === 1) {
    text = `${subject} escribió: "${clean(lastCustomerContent(messages), 100)}".`
  } else {
    const mentions = intent.topics.slice(0, 3).join(", ")
    const detail = mentions ? ` y menciona ${mentions}` : ""
    text = `${subject} consulta sobre ${intentLabel(intent.intents)}${detail}.`
  }

  return { text, intents: intent.intents, keyFacts: facts }
}

/** Construye el resumen desde cero. */
export function buildCopilotSummary(
  messages: InboxMessageDTO[],
  context: SummaryContext = {},
): CopilotSummary {
  const base = summarize(messages, context.customerName ?? null)
  const lastMessage = messages[messages.length - 1]
  return {
    ...base,
    lastMessageId: lastMessage?.id ?? null,
    updatedAt: new Date().toISOString(),
  }
}

/**
 * Actualiza incrementalmente un resumen previo. Solo se re-procesan los
 * mensajes nuevos (los que vinieron después del cubierto por el anterior);
 * los hechos previos se conservan y se añade el último mensaje del cliente.
 */
export function updateCopilotSummary(
  previous: CopilotSummary | null,
  allMessages: InboxMessageDTO[],
  context: SummaryContext = {},
): CopilotSummary {
  if (!previous) return buildCopilotSummary(allMessages, context)
  if (allMessages.length === 0) return previous

  const lastMessage = allMessages[allMessages.length - 1]
  if (previous.lastMessageId === lastMessage.id) return previous

  const base = summarize(allMessages, context.customerName ?? null)
  const newFact = factOf(lastMessage)

  const keyFacts = [...previous.keyFacts]
  if (newFact) keyFacts.unshift(newFact)
  const unique = Array.from(new Set(keyFacts)).slice(0, 4)

  const text =
    base.text === previous.text
      ? previous.text
      : `${previous.text} Además: ${clean(lastCustomerContent(allMessages), 80)}.`

  return {
    text,
    intents: base.intents,
    keyFacts: unique,
    lastMessageId: lastMessage.id,
    updatedAt: new Date().toISOString(),
  }
}
