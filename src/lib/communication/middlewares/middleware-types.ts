/**
 * Communication Integration Layer (FASE 7C) — Cadena de middlewares de envío.
 *
 * Cada middleware envuelve el envío de un mensaje de salida y puede: validar,
 * normalizar, reintentar, limitar o loguear. El orden de composición es el
 * mismo del array (el primero se ejecuta primero, como `app.use` de Express).
 *
 * `next(input?)` permite que un middleware transforme el input antes de que
 * llegue a los eslabones internos (p.ej. normalización).
 */
import type { ProviderOutboundInput, ProviderSendResult } from "../provider-types"

/** Middleware de envío: recibe el input y el `next()` del siguiente eslabón. */
export type SendMiddleware = (
  input: ProviderOutboundInput,
  next: (input?: ProviderOutboundInput) => Promise<ProviderSendResult>,
) => Promise<ProviderSendResult>

/** Compone los middlewares alrededor del envío base del proveedor. */
export function composeSendMiddlewares(
  middlewares: SendMiddleware[],
  baseSend: (input: ProviderOutboundInput) => Promise<ProviderSendResult>,
): (input: ProviderOutboundInput) => Promise<ProviderSendResult> {
  type SendFn = (input: ProviderOutboundInput) => Promise<ProviderSendResult>
  const chain = middlewares.reduceRight<SendFn>(
    (next, middleware) => (input) => middleware(input, (nextInput) => next(nextInput ?? input)),
    (input) => baseSend(input),
  )
  return (input) => chain(input)
}
