/**
 * Platform (FASE 8D) — utilidad criptográfica para fixtures (espejo de api-key).
 */
import { createHash } from "node:crypto"

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex")
}
