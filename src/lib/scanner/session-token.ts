/**
 * Verificación del token de sesión del escáner (FASE 8G — fix P1).
 *
 * El token se genera en `/api/scanner/session` (randomUUID) y viaja dentro del
 * QR (`?token=`). Todas las operaciones de la sesión (`connect`, `scan`,
 * `disconnect`) deben presentarlo; de lo contrario cualquiera podría forjar
 * escaneos o desconectar la sesión de otro POS.
 *
 * La comparación es timing-safe (misma longitud + timingSafeEqual) para evitar
 * timing attacks sobre el token.
 */
import { timingSafeEqual } from "crypto"

export function verifyScannerToken(expected: string, received: string | null | undefined): boolean {
  if (typeof received !== "string" || received.length === 0 || expected.length === 0) return false
  const bufA = Buffer.from(expected)
  const bufB = Buffer.from(received)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}
