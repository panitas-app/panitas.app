/**
 * Communication Integration Layer (FASE 7C) — Interfaz de proveedor.
 *
 * Contrato común que debe implementar cualquier conector de mensajería
 * (WhatsApp, Instagram, Messenger, Email, Chat web, ...). El Inbox y el resto
 * del sistema dependen SOLO de esta interfaz: nunca de un proveedor concreto.
 */
import type {
  ProviderConnectionResult,
  ProviderHealth,
  ProviderInboundEvent,
  ProviderMeta,
  ProviderOutboundInput,
  ProviderSendResult,
  ProviderSender,
  ProviderWebhookPayload,
  ProviderAttachment,
} from "../provider-types"

export interface ProviderSendOptions {
  /** Señal de cancelación (opcional) para envíos largos. */
  signal?: AbortSignal
}

export interface CommunicationProvider {
  readonly meta: ProviderMeta

  /** Conecta con el proveedor usando la configuración provista (OAuth/API key/webhook). */
  connect(config?: Record<string, unknown>): Promise<ProviderConnectionResult>

  /** Desconecta de forma limpia. */
  disconnect(): Promise<void>

  /** Envía un mensaje de salida (agente → cliente) por el canal del proveedor. */
  sendMessage(input: ProviderOutboundInput, options?: ProviderSendOptions): Promise<ProviderSendResult>

  /** Descarga un adjunto desde el proveedor por su id. */
  downloadMedia(mediaId: string): Promise<ProviderAttachment>

  /** Sube un adjunto al proveedor (para envíos con media). */
  uploadMedia(attachment: ProviderAttachment): Promise<ProviderAttachment>

  /** Marca un mensaje como leído en el proveedor. */
  markAsRead(conversationId: string, messageId: string): Promise<void>

  /** Indica al proveedor que el agente está escribiendo (typing indicator). */
  typing(conversationId: string, typing: boolean): Promise<void>

  /** Estado de salud del proveedor: conexión, latencia y última sincronización. */
  health(): Promise<ProviderHealth>

  /** Recibe un webhook del proveedor, verifica su firma y lo convierte a eventos unificados. */
  webhook(payload: ProviderWebhookPayload): Promise<ProviderInboundEvent[]>

  /** Pull opcional: recupera mensajes entrantes pendientes (polling). */
  receiveMessages?(limit?: number): Promise<ProviderInboundEvent[]>

  /** Hook de simulación: inyecta un mensaje entrante como si viniera del canal (tests/demo). */
  simulateIncoming?(input: {
    conversationId: string
    text: string
    sender?: ProviderSender
  }): Promise<ProviderInboundEvent>
}
