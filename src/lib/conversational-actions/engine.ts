/**
 * Conversational Actions Engine (FASE 5D).
 *
 * Orquesta un turno de acciones conversacionales de forma determinista (sin LLM):
 *
 *   1. Detecta la acción más probable del catálogo.
 *   2. Completa los parámetros faltantes en varios turnos (awaiting_details).
 *   3. Pide confirmación solo para acciones críticas/destructivas/masivas.
 *   4. Ejecuta vía `executor.ts` (tools 3B existentes + services 1B).
 *   5. Devuelve una respuesta enriquecida (tarjetas, tablas, resúmenes).
 *
 * El estado del turno (actionId, knownParams, status) lo persiste el contexto
 * conversacional 5C para que el usuario rellene datos sin reiniciar el flujo.
 * Regla 5B: las respuestas NUNCA exponen tool names, IDs internos ni JSON crudo.
 */
import type { StoreServiceContext } from "@/services/context"
import type { ConfirmationRequest } from "@/lib/agent-intel/types"
import type { PendingParameter } from "@/lib/conversations/conversation-types"
import { ACTION_CATALOG } from "./catalog"
import { detectAction, normalize } from "./detector"
import {
  extractKnownParams,
  extractAmount,
  extractSaleItems,
  inferStockType,
  isShortAnswer,
  missingParams,
  nextPrompt,
} from "./params"
import { executeAction, ActionInputError, ActionExecutionError } from "./executor"
import type { ExecutorDeps } from "./executor"
import type { ActionsTurnResult, ConversationalAction, KnownParams } from "./types"

/** Estado conversacional previo del turno (persistido por 5C). */
export interface ActionsSession {
  actionId?: string
  knownParams: KnownParams
  status?: "active" | "awaiting_details" | "awaiting_confirmation" | "awaiting_retry" | "ready"
}

/** Entrada del motor de acciones. */
export interface ActionsEngineInput {
  message: string
  ctx: StoreServiceContext
  runtime: {
    userId: string
    storeId: string
    negocioId?: string | null
    plan: string
    role: string
    permissions: string[]
  }
  /** Estado previo restaurado del contexto 5C. */
  previous?: ActionsSession
  /** true si el usuario ya confirmó la acción pendiente (segunda vuelta). */
  confirmed?: boolean
}

/** Dependencias del motor. */
export interface ActionsEngineDeps {
  catalog?: ConversationalAction[]
  executor: ExecutorDeps
}

const AFFIRMATIVE_RE =
  /^(?:si|sí|claro|claro que si|claro que sí|si claro|sí claro|ok|okay|dale|hazlo|adelante|adelante pues|confirmo|confirmar|confirmado|si confirmo|sí confirmo|si confirma|sí confirma|listo|vamos|bueno|perfecto|de acuerdo|si hazlo|sí hazlo|si dale|hazlo si|por favor|de una|de una vez)$/

const NEGATIVE_RE =
  /^(?:no|no gracias|no hagas|no lo hagas|no lo haga|no me lo hagas|mejor no|cancelar|cancela|cancelalo|cancelarlo|nada|quita|para|dejalo|déjalo|ya no|olvidalo|olvídalo)$/

/** Claves de parámetros que representan referencias a entidades (para reintentar). */
const ENTITY_KEYS = ["producto", "termino", "cliente", "gasto", "pedido", "items", "nombre", "vendor"]

function isAffirmative(message: string): boolean {
  const m = normalize(message).replace(/[.,!¡¿?;:]+/g, "").trim()
  return AFFIRMATIVE_RE.test(m)
}

function isNegative(message: string): boolean {
  const m = normalize(message).replace(/[.,!¡¿?;:]+/g, "").trim()
  return NEGATIVE_RE.test(m)
}

/** Ajustes de parámetros específicos por acción (complementan la extracción genérica). */
function applyActionFallbacks(action: ConversationalAction, known: KnownParams, message: string): KnownParams {
  const next: KnownParams = { ...known }
  const amount = extractAmount(message)

  if (action.id === "ajustar_stock") {
    if (!next.tipo) next.tipo = inferStockType(message)
    if (!next.cantidad && amount) next.cantidad = amount
  }
  if (action.id === "cambiar_precio" && !next.precio && amount) next.precio = amount
  if (action.id === "crear_producto" && !next.stock) {
    const stock = message.match(/(?:stock|existencias)\s+(?:inicial\s+)?(\d+(?:[.,]\d+)?)/i)
    if (stock) next.stock = stock[1].replace(",", ".")
  }
  return next
}

/** Limpia una respuesta corta del usuario antes de usarla como valor de parámetro. */
function cleanRefill(value: string): string {
  return value.trim().replace(/^(a|para|al|la|el|un|una|de|del|en|con)\s+/i, "").trim()
}

/** Serializa items a partir de una respuesta corta del usuario. */
function refillItemValue(value: string): string {
  const parsed = extractSaleItems(value)
  if (parsed.length > 0) return JSON.stringify(parsed)
  return JSON.stringify([{ producto: cleanRefill(value), cantidad: 1 }])
}

/** Reemplaza la referencia a entidad en un reintento (respuesta corta del usuario). */
function refillEntityKey(action: ConversationalAction, known: KnownParams, value: string): KnownParams {
  const key = ENTITY_KEYS.find((k) => action.params.some((p) => p.key === k))
  if (!key) return known
  if (key === "items") {
    return { ...known, items: refillItemValue(value) }
  }
  return { ...known, [key]: cleanRefill(value) }
}

/** Rellena el primer parámetro que falta con la respuesta corta del usuario. */
function refillMissingParam(known: KnownParams, missing: Array<import("./types").ActionParam>, value: string): KnownParams {
  const key = missing[0].key
  if (key === "items") {
    return { ...known, items: refillItemValue(value) }
  }
  return { ...known, [key]: cleanRefill(value) }
}

export class ConversationalActionsEngine {
  private readonly catalog: ConversationalAction[]
  private readonly executor: ExecutorDeps

  constructor(deps: ActionsEngineDeps) {
    this.catalog = deps.catalog ?? ACTION_CATALOG
    this.executor = deps.executor
  }

  /** Procesa un turno y devuelve el resultado de la acción (o no_action). */
  async run(input: ActionsEngineInput): Promise<ActionsTurnResult> {
    const message = input.message.trim()
    const previous = input.previous ?? { knownParams: {} }
    const now = new Date().toISOString()

    const detected = detectAction(this.catalog, message)
    const affirmative = isAffirmative(message)
    const negative = isNegative(message)

    // ── Continuar una confirmación pendiente ─────────────────────────────
    if (previous.actionId && previous.status === "awaiting_confirmation") {
      const action = this.findAction(previous.actionId)
      if (!action) {
        return this.startFresh(detected, message, input, now)
      }
      if (affirmative || input.confirmed) {
        return this.execute(action, previous.knownParams, message, input)
      }
      if (negative) {
        return {
          status: "completed",
          actionId: undefined,
          knownParams: {},
          contextStatus: "active",
          reply: "Listo, cancelé esa acción. ¿En qué más te ayudo?",
        }
      }
      if (detected && detected.action.id !== action.id) {
        return this.startFresh(detected, message, input, now)
      }
      // Respuesta ambigua: se repite la solicitud de confirmación.
      return this.buildConfirmation(action, previous.knownParams, now)
    }

    // ── Continuar completando detalles ───────────────────────────────────
    if (previous.actionId && (previous.status === "awaiting_details" || previous.status === "awaiting_retry")) {
      const action = this.findAction(previous.actionId)
      if (action && (!detected || detected.action.id === action.id)) {
        if (previous.status === "awaiting_retry") {
          return this.retry(action, previous.knownParams, message, input)
        }
        return this.continueAction(action, previous.knownParams, message, input, now)
      }
      if (detected) {
        return this.startFresh(detected, message, input, now)
      }
    }

    // ── Acción nueva ─────────────────────────────────────────────────────
    return this.startFresh(detected, message, input, now)
  }

  private findAction(actionId: string): ConversationalAction | null {
    return this.catalog.find((a) => a.id === actionId) ?? null
  }

  private async startFresh(
    detected: ReturnType<typeof detectAction>,
    message: string,
    input: ActionsEngineInput,
    now: string,
  ): Promise<ActionsTurnResult> {
    if (!detected) {
      return { status: "no_action", reply: "", contextStatus: "active", knownParams: {} }
    }
    const known = extractKnownParams(message, detected.action.domain)
    return this.advance(detected.action, applyActionFallbacks(detected.action, known, message), message, input, now)
  }

  private async continueAction(
    action: ConversationalAction,
    known: KnownParams,
    message: string,
    input: ActionsEngineInput,
    now: string,
  ): Promise<ActionsTurnResult> {
    let merged: KnownParams = { ...known }
    if (message.trim()) {
      merged = { ...merged, ...extractKnownParams(message, action.domain, merged) }
    }

    // Respuesta corta: rellena el primer parámetro que falta.
    if (isShortAnswer(message)) {
      const missing = missingParams(action, merged)
      if (missing.length > 0) {
        merged = refillMissingParam(merged, missing, message)
      }
    }

    return this.advance(action, applyActionFallbacks(action, merged, message), message, input, now)
  }

  private async retry(
    action: ConversationalAction,
    known: KnownParams,
    message: string,
    input: ActionsEngineInput,
  ): Promise<ActionsTurnResult> {
    let merged: KnownParams = { ...known }
    if (message.trim()) {
      merged = { ...merged, ...extractKnownParams(message, action.domain, merged) }
    }
    if (isShortAnswer(message)) {
      merged = refillEntityKey(action, merged, message)
    }
    return this.execute(action, applyActionFallbacks(action, merged, message), message, input)
  }

  private async advance(
    action: ConversationalAction,
    known: KnownParams,
    message: string,
    input: ActionsEngineInput,
    now: string,
  ): Promise<ActionsTurnResult> {
    const missing = missingParams(action, known)

    if (missing.length > 0) {
      const pendingParams: PendingParameter[] = missing.map((p) => ({ key: p.key, label: p.label, prompt: p.prompt }))
      return {
        status: "awaiting_details",
        actionId: action.id,
        knownParams: known,
        pendingParams,
        contextStatus: "awaiting_details",
        reply: nextPrompt(action, missing),
      }
    }

    const level = action.confirmationWhen ? action.confirmationWhen(known) : action.confirmation
    if (level !== "none") {
      return this.buildConfirmation(action, known, now)
    }

    return this.execute(action, known, message, input)
  }

  private buildConfirmation(action: ConversationalAction, known: KnownParams, now: string): ActionsTurnResult {
    const description = action.confirmDescription ?? `Voy a "${action.label}"`
    const impact = action.confirmImpact ?? "Esta acción modifica datos de tu negocio."
    const stepId = `action:${action.id}`
    const message = `${description}. ${impact} ¿Confirmas?`

    const confirmation: ConfirmationRequest = {
      actions: [{ stepId, tool: "conversational_action", description, impact }],
      message,
      confirmCodes: [`confirm-${action.id}`],
      requestedAt: now,
    }

    return {
      status: "confirmation_required",
      actionId: action.id,
      knownParams: known,
      confirmation,
      contextStatus: "awaiting_confirmation",
      reply: message,
    }
  }

  private async execute(
    action: ConversationalAction,
    known: KnownParams,
    message: string,
    input: ActionsEngineInput,
  ): Promise<ActionsTurnResult> {
    try {
      const result = await executeAction(this.executor, {
        actionId: action.id,
        known,
        message,
        ctx: input.ctx,
        runtime: input.runtime,
      })
      return {
        status: "completed",
        actionId: action.id,
        knownParams: known,
        contextStatus: "active",
        reply: result.reply,
        rich: result.rich,
      }
    } catch (error) {
      if (error instanceof ActionInputError) {
        // Falta corregir algo: se queda pendiente para reintentar con el dato.
        return {
          status: "awaiting_retry",
          actionId: action.id,
          knownParams: known,
          contextStatus: "awaiting_retry",
          reply: error.message,
        }
      }
      if (error instanceof ActionExecutionError) {
        // Falla del handler (tool/service): se cierra el turno sin romper el chat.
        return {
          status: "completed",
          actionId: action.id,
          knownParams: known,
          contextStatus: "active",
          reply: `No pude completar eso: ${error.message}`,
        }
      }
      throw error
    }
  }
}
