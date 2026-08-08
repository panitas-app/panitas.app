/**
 * Omnichannel Inbox (FASE 7A).
 *
 * Centro Unificado de Conversaciones de Panitas Plus. Módulo nuevo e
 * independiente del motor conversacional del asistente (FASE 3C/5C, que vive en
 * `src/lib/conversations/`). Arquitectura preparada para múltiples canales
 * (WhatsApp, Instagram, Messenger, chat de tienda online, email y futuros),
 * integración con CRM, contexto de cliente y análisis IA sin respuestas
 * automáticas.
 */
export * from "./conversation-types"
export * from "./channel-manager"
export * from "./conversation-service"
export * from "./message-service"
export * from "./conversation-context"
export * from "./conversation-ai"
