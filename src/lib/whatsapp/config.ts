/**
 * WhatsApp Cloud API (FASE 8A) — Configuración de la aplicación.
 *
 * Lee de variables de entorno los valores a nivel de Meta App (compartidos por
 * todos los negocios): versión de la Graph API, App Secret para firmas, verify
 * token global y credenciales por defecto. Lo específico de cada negocio
 * (accessToken, phoneNumberId) vive en `ChannelConnection` (multi-tenant).
 */

export interface WhatsAppAppConfig {
  version: string
  baseUrl: string
  appSecret: string
  verifyToken: string
  defaultAccessToken: string
  defaultPhoneNumberId: string
  timeoutMs: number
}

const DEFAULT_VERSION = "v22.0"
const DEFAULT_BASE_URL = "https://graph.facebook.com"

function env(name: string): string {
  return process.env[name]?.trim() ?? ""
}

/** Lee la configuración de la app desde el entorno. Sin secretos en logs. */
export function readWhatsAppAppConfig(): WhatsAppAppConfig {
  return {
    version: env("WHATSAPP_API_VERSION") || DEFAULT_VERSION,
    baseUrl: env("WHATSAPP_BASE_URL") || DEFAULT_BASE_URL,
    appSecret: env("WHATSAPP_APP_SECRET"),
    verifyToken: env("WHATSAPP_VERIFY_TOKEN"),
    defaultAccessToken: env("WHATSAPP_DEFAULT_ACCESS_TOKEN"),
    defaultPhoneNumberId: env("WHATSAPP_DEFAULT_PHONE_NUMBER_ID"),
    timeoutMs: Number(env("WHATSAPP_TIMEOUT_MS") || 15_000),
  }
}

/** True si hay configuración de app mínima (App Secret o verify token). */
export function hasWhatsAppAppConfig(): boolean {
  const config = readWhatsAppAppConfig()
  return Boolean(config.appSecret || config.verifyToken || config.defaultAccessToken)
}

/** True si existe una conexión por defecto configurada en el entorno. */
export function hasWhatsAppDefaultConnection(): boolean {
  const config = readWhatsAppAppConfig()
  return Boolean(config.defaultAccessToken && config.defaultPhoneNumberId)
}
