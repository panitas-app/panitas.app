/**
 * Instagram + Messenger (FASE 8B) — Configuración de la aplicación.
 *
 * Lee de variables de entorno los valores a nivel de Meta App compartidos por
 * ambos canales (versión de la Graph API, base URL, App Secret para firmas y
 * verify token). Lo específico de cada negocio (accessToken, accountId) vive en
 * `ChannelConnection` (multi-tenant), de modo que este módulo nunca expone
 * secretos en logs ni respuestas.
 */
export type MetaChannel = "instagram" | "messenger"

export interface MetaAppConfig {
  version: string
  baseUrl: string
  appSecret: string
  verifyToken: string
  timeoutMs: number
}

const DEFAULT_VERSION = "v22.0"
const DEFAULT_BASE_URL = "https://graph.facebook.com"

function env(name: string): string {
  return process.env[name]?.trim() ?? ""
}

/** Lee la configuración de la app desde el entorno. Sin secretos en logs. */
export function readMetaAppConfig(): MetaAppConfig {
  return {
    version: env("META_API_VERSION") || DEFAULT_VERSION,
    baseUrl: env("META_BASE_URL") || DEFAULT_BASE_URL,
    appSecret: env("META_APP_SECRET"),
    verifyToken: env("META_VERIFY_TOKEN"),
    timeoutMs: Number(env("META_TIMEOUT_MS") || 15_000),
  }
}

/** True si hay configuración de app mínima (App Secret o verify token). */
export function hasMetaAppConfig(): boolean {
  const config = readMetaAppConfig()
  return Boolean(config.appSecret || config.verifyToken)
}

/** Devuelve el prefijo de external ref de una conversación por canal. */
export function externalRefPrefix(channel: MetaChannel): string {
  return channel === "instagram" ? "ig" : "fb"
}

/** Nombre de etiqueta por defecto para clientes sin nombre en un canal. */
export function defaultCustomerName(channel: MetaChannel): string {
  return channel === "instagram" ? "Contacto de Instagram" : "Contacto de Messenger"
}
