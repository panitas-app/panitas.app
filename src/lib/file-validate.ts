export interface FileTypeConfig {
  mime: string
  extensions: string[]
  maxBytes: number
  label: string
}

export const FILE_TYPES: FileTypeConfig[] = [
  { mime: "image/jpeg", extensions: [".jpg", ".jpeg"], maxBytes: 5 * 1024 * 1024, label: "Imagen JPEG" },
  { mime: "image/png", extensions: [".png"], maxBytes: 5 * 1024 * 1024, label: "Imagen PNG" },
  { mime: "image/webp", extensions: [".webp"], maxBytes: 5 * 1024 * 1024, label: "Imagen WebP" },
  { mime: "image/gif", extensions: [".gif"], maxBytes: 5 * 1024 * 1024, label: "Imagen GIF" },
  { mime: "application/pdf", extensions: [".pdf"], maxBytes: 10 * 1024 * 1024, label: "PDF" },
  { mime: "video/mp4", extensions: [".mp4"], maxBytes: 50 * 1024 * 1024, label: "Video MP4" },
  { mime: "video/webm", extensions: [".webm"], maxBytes: 50 * 1024 * 1024, label: "Video WebM" },
  { mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", extensions: [".xlsx"], maxBytes: 5 * 1024 * 1024, label: "Excel" },
  { mime: "application/vnd.ms-excel", extensions: [".xls"], maxBytes: 5 * 1024 * 1024, label: "Excel (antiguo)" },
]

export type AllowedMimeType = (typeof FILE_TYPES)[number]["mime"]
export const ALLOWED_MIME_TYPES: AllowedMimeType[] = FILE_TYPES.map((t) => t.mime as AllowedMimeType)
export const ALLOWED_EXTENSIONS: Record<string, string[]> = Object.fromEntries(FILE_TYPES.map((t) => [t.mime, t.extensions]))

const IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"])
const VIDEO_MIMES = new Set(["video/mp4", "video/webm"])

function at(buf: Buffer, offset: number, sig: number[]): boolean {
  if (buf.length < offset + sig.length) return false
  for (let i = 0; i < sig.length; i++) {
    if (buf[offset + i] !== sig[i]) return false
  }
  return true
}

function detectMime(buffer: Buffer): string | null {
  if (at(buffer, 0, [0xFF, 0xD8, 0xFF])) return "image/jpeg"
  if (at(buffer, 0, [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])) return "image/png"
  if (at(buffer, 0, [0x47, 0x49, 0x46, 0x38]) && (buffer[4] === 0x37 || buffer[4] === 0x39) && buffer[5] === 0x61) return "image/gif"
  if (at(buffer, 0, [0x52, 0x49, 0x46, 0x46]) && at(buffer, 8, [0x57, 0x45, 0x42, 0x50])) return "image/webp"
  if (at(buffer, 0, [0x25, 0x50, 0x44, 0x46, 0x2D])) return "application/pdf"
  // MP4: starts with ftyp box (00 00 00 XX 66 74 79 70)
  if (buffer.length >= 8 && at(buffer, 4, [0x66, 0x74, 0x79, 0x70])) return "video/mp4"
  // WebM: EBML header (1A 45 DF A3)
  if (at(buffer, 0, [0x1A, 0x45, 0xDF, 0xA3])) return "video/webm"
  // Excel (OOXML) = ZIP magic bytes (50 4B 03 04)
  if (at(buffer, 0, [0x50, 0x4B, 0x03, 0x04])) return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  // Excel (older .xls): D0 CF 11 E0
  if (at(buffer, 0, [0xD0, 0xCF, 0x11, 0xE0])) return "application/vnd.ms-excel"
  return null
}

export interface FileValidationResult {
  valid: boolean
  detectedMime: string | null
  declaredMime: string
  extension: string
  size: number
  reason?: string
}

export function validateFileUpload(file: { name: string; type: string; size: number }, buffer: Buffer): FileValidationResult {
  const declaredMime = (file.type || "").toLowerCase()
  const extension = (file.name.match(/\.[a-z0-9]+$/i)?.[0] || "").toLowerCase()
  const detectedMime = detectMime(buffer)

  const result: FileValidationResult = {
    valid: true,
    detectedMime,
    declaredMime,
    extension,
    size: file.size,
  }

  if (file.size <= 0) {
    result.valid = false
    result.reason = "El archivo está vacío"
    return result
  }

  // SVG must be rejected unconditionally
  if (declaredMime === "image/svg+xml" || extension === ".svg" || extension === ".svgz") {
    result.valid = false
    result.reason = "Los archivos SVG no están permitidos por seguridad"
    return result
  }

  if (!detectedMime) {
    result.valid = false
    result.reason = "No se pudo identificar el tipo de archivo"
    return result
  }

  // Check against accepted types
  const config = FILE_TYPES.find((t) => t.mime === detectedMime)
  if (!config) {
    result.valid = false
    result.reason = "Tipo de archivo no aceptado"
    return result
  }

  // Validate extension matches detected type
  if (!config.extensions.includes(extension)) {
    result.valid = false
    result.reason = `La extensión "${extension}" no es válida para ${config.label}`
    return result
  }

  // Size limit per type
  if (file.size > config.maxBytes) {
    const mb = config.maxBytes / 1024 / 1024
    result.valid = false
    result.reason = `El archivo excede el límite de ${mb}MB para ${config.label}`
    return result
  }

  return result
}

export function isImageMime(mime: string): boolean {
  return IMAGE_MIMES.has(mime)
}

export function isVideoMime(mime: string): boolean {
  return VIDEO_MIMES.has(mime)
}
