/**
 * Platform (FASE 8D) — guard de las API internas de Integraciones.
 * Solo admin/manager pueden gestionar API keys, webhooks y extensiones.
 */
import { requireRole, type StoreInfo } from "@/lib/permissions"

export async function requireIntegrationsAdmin(): Promise<StoreInfo> {
  return requireRole(["admin", "manager"])
}
