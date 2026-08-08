/**
 * Communication Integration Layer (FASE 8B) — Proveedor real de Messenger.
 *
 * Conector real contra la Graph API de Meta (Messenger Platform). Extiende
 * `MetaMessagingProvider` (formato `entry[].messaging`, envío por `me/messages`,
 * `mark_seen`, `typing_on/off`, firma `x-hub-signature-256`).
 *
 * Se activa solo con una conexión válida en BD; sin credenciales la capa usa el
 * proveedor mock (config-gated).
 */
import { MetaMessagingProvider, type MetaMessagingConfig, type MetaMessagingProviderOptions } from "./meta-messaging-provider"

export type MessengerProviderOptions = MetaMessagingProviderOptions
export type MessengerConnectionConfig = MetaMessagingConfig

export class MessengerProvider extends MetaMessagingProvider {
  constructor(options: MessengerProviderOptions = {}) {
    super("messenger", options)
  }
}
