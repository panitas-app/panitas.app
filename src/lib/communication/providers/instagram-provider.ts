/**
 * Communication Integration Layer (FASE 8B) — Proveedor real de Instagram.
 *
 * Conector real contra la Graph API de Meta (Instagram Messaging API). Extiende
 * `MetaMessagingProvider` (formato `entry[].messaging`, envío por `/messages`,
 * `mark_seen`, `typing_on/off`, firma `x-hub-signature-256`).
 *
 * Se activa solo con una conexión válida en BD; sin credenciales la capa usa el
 * proveedor mock (config-gated).
 */
import { MetaMessagingProvider, type MetaMessagingConfig, type MetaMessagingProviderOptions } from "./meta-messaging-provider"

export type InstagramProviderOptions = MetaMessagingProviderOptions
export type InstagramConnectionConfig = MetaMessagingConfig

export class InstagramProvider extends MetaMessagingProvider {
  constructor(options: InstagramProviderOptions = {}) {
    super("instagram", options)
  }
}
