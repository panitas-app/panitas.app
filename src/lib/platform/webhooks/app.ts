/**
 * Platform (FASE 8D) — singleton del dispatcher de webhooks.
 * Es el módulo que los API routes y el event system importan (evita ciclos).
 */
import { createWebhookDispatcher } from "./dispatcher"

export const webhookDispatcher = createWebhookDispatcher()
