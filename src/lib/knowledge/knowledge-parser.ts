/**
 * Business Knowledge Base (FASE 7D) — Parser de documentos.
 *
 * Extrae texto de los formatos soportados sin dependencias externas:
 *
 *   - TXT / MD / CSV  → decodificación UTF-8 directa.
 *   - PDF             → lectura best-effort de los streams de texto
 *                       (FlateDecode y sin comprimir). Devuelve `null` si el
 *                       PDF está encriptado o usa filtros no soportados.
 *   - DOCX            → lector ZIP mínimo (stored / deflate) sobre
 *                       `word/document.xml` y extracción de los párrafos.
 *
 * La extracción es "mejor esfuerzo": si no se puede extraer texto, el
 * documento se registra igualmente con sus metadatos y contenido vacío.
 */
import { inflateSync, inflateRawSync } from "node:zlib"

export interface ExtractionResult {
  text: string | null
  format: "txt" | "pdf" | "docx" | "unknown"
}

const TEXT_EXTENSIONS = new Set([".txt", ".md", ".markdown", ".csv", ".log", ".rtf"])

/** Decide el formato por extensión/MIME. */
export function detectTextFormat(mime: string | null | undefined, extension: string | null | undefined): "txt" | "pdf" | "docx" | "unknown" {
  const ext = (extension ?? "").toLowerCase()
  const m = (mime ?? "").toLowerCase()
  if (m.startsWith("text/") || TEXT_EXTENSIONS.has(ext)) return "txt"
  if (ext === ".pdf" || m === "application/pdf") return "pdf"
  if (ext === ".docx" || m === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "docx"
  return "unknown"
}

/**
 * Extrae el texto plano de un buffer. Nunca lanza: ante cualquier problema
 * devuelve `{ text: null }`.
 */
export function extractTextFromBuffer(buffer: Uint8Array, input: { mime?: string | null; extension?: string | null } = {}): ExtractionResult {
  try {
    const format = detectTextFormat(input.mime ?? null, input.extension ?? null)
    if (format === "txt") {
      const text = new TextDecoder("utf-8", { fatal: false }).decode(buffer)
      return { text: normalizeExtractedText(text), format }
    }
    if (format === "pdf") {
      const text = extractPdfText(buffer)
      return { text: text ? normalizeExtractedText(text) : null, format }
    }
    if (format === "docx") {
      const text = extractDocxText(buffer)
      return { text: text ? normalizeExtractedText(text) : null, format }
    }
    return { text: null, format }
  } catch {
    return { text: null, format: "unknown" }
  }
}

/** Normaliza el texto extraído (saltos/espacios múltiples). */
export function normalizeExtractedText(text: string): string {
  return text
    .replace(/\u0000/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/^ +| +$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

// ─── PDF (best-effort) ──────────────────────────────────────────────────────

function tryInflate(data: Buffer): Buffer | null {
  try {
    return inflateSync(data)
  } catch {
    try {
      return inflateRawSync(data)
    } catch {
      return null
    }
  }
}

/** Extrae las cadenas `(texto)` de un stream de contenido PDF. */
function extractStringsFromContent(content: Buffer): string[] {
  const text = content.toString("latin1")
  const out: string[] = []
  const re = /\(((?:[^()\\]|\\.)*)\)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const raw = m[1]
    if (raw.length === 0) continue
    out.push(
      raw
        .replace(/\\([nrtbf()\\])/g, (_, c: string) => {
          const map: Record<string, string> = { n: "\n", r: "\r", t: "\t", b: "\b", f: "\f", "(": "(", ")": ")", "\\": "\\" }
          return map[c] ?? ""
        })
        .replace(/\\\d{1,3}/g, ""),
    )
  }
  return out
}

/** Extrae texto de un PDF leyendo los streams de contenido (best-effort). */
export function extractPdfText(buffer: Uint8Array): string | null {
  const raw = Buffer.from(buffer)
  if (!raw.subarray(0, 5).toString("latin1").startsWith("%PDF")) return null

  let found = false
  const parts: string[] = []
  const STREAM = Buffer.from("stream", "latin1")
  const ENDSTREAM = Buffer.from("endstream", "latin1")

  let idx = 0
  while (idx < raw.length) {
    const start = raw.indexOf(STREAM, idx)
    if (start === -1) break
    // saltar el prefijo "stream" y el salto de línea
    let dataStart = start + 6
    while (dataStart < raw.length && (raw[dataStart] === 0x0d || raw[dataStart] === 0x0a)) dataStart++
    const endMarker = raw.indexOf(ENDSTREAM, dataStart)
    if (endMarker === -1) break
    let dataEnd = endMarker
    while (dataEnd > dataStart && (raw[dataEnd - 1] === 0x0d || raw[dataEnd - 1] === 0x0a)) dataEnd--
    const streamData = raw.subarray(dataStart, dataEnd)

    const decoded = tryInflate(Buffer.from(streamData)) ?? Buffer.from(streamData)
    const strings = extractStringsFromContent(decoded)
    if (strings.length > 0) {
      found = true
      parts.push(strings.join(" "))
    }
    idx = endMarker + 9
  }

  if (!found) return null
  return parts.join("\n")
}

// ─── DOCX (lector ZIP mínimo) ───────────────────────────────────────────────

function readU16(buf: Buffer, offset: number): number {
  return buf.readUInt16LE(offset)
}

function readU32(buf: Buffer, offset: number): number {
  return buf.readUInt32LE(offset)
}

interface ZipEntry {
  name: string
  compression: number
  localHeaderOffset: number
}

/** Encuentra el End of Central Directory y lista las entradas del ZIP. */
function parseZipEntries(buffer: Buffer): ZipEntry[] {
  let eocd = -1
  for (let i = buffer.length - 22; i >= 0; i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd === -1) return []

  const entryCount = readU16(buffer, eocd + 10)
  let offset = readU32(buffer, eocd + 16)
  const entries: ZipEntry[] = []
  for (let i = 0; i < entryCount; i++) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) break
    const compression = readU16(buffer, offset + 10)
    const nameLength = readU16(buffer, offset + 28)
    const extraLength = readU16(buffer, offset + 30)
    const commentLength = readU16(buffer, offset + 32)
    const localHeaderOffset = readU32(buffer, offset + 42)
    const name = buffer.subarray(offset + 46, offset + 46 + nameLength).toString("utf8")
    entries.push({ name, compression, localHeaderOffset })
    offset += 46 + nameLength + extraLength + commentLength
  }
  return entries
}

/** Extrae el contenido de una entrada del ZIP (stored o deflate). */
function extractZipEntry(buffer: Buffer, entry: ZipEntry): Buffer | null {
  const start = entry.localHeaderOffset
  if (start < 0 || start + 30 > buffer.length) return null
  if (buffer.readUInt32LE(start) !== 0x04034b50) return null
  const nameLength = readU16(buffer, start + 26)
  const extraLength = readU16(buffer, start + 28)
  const dataStart = start + 30 + nameLength + extraLength
  if (entry.compression === 0) {
    return buffer.subarray(dataStart)
  }
  if (entry.compression === 8) {
    try {
      return inflateRawSync(buffer.subarray(dataStart))
    } catch {
      return null
    }
  }
  return null
}

/** Extrae texto de un DOCX (word/document.xml → texto plano). */
export function extractDocxText(buffer: Uint8Array): string | null {
  const raw = Buffer.from(buffer)
  const entries = parseZipEntries(raw)
  const doc = entries.find((e) => e.name === "word/document.xml")
  if (!doc) return null
  const xml = extractZipEntry(raw, doc)
  if (!xml) return null

  const xmlText = xml.toString("utf8")
  // Divide por párrafos, extrae texto de cada uno.
  const paragraphs = xmlText.match(/<w:p[ >][\s\S]*?<\/w:p>|<w:p[^>]*\/>/g) ?? []
  const lines: string[] = []
  for (const p of paragraphs) {
    const runs = p.match(/<w:t(?: [^>]*)?>([\s\S]*?)<\/w:t>/g) ?? []
    const line = runs
      .map((r) => r.replace(/<w:t(?: [^>]*)?>/, "").replace(/<\/w:t>/, ""))
      .join("")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
    if (line.trim()) lines.push(line)
  }
  if (lines.length === 0) return null
  return lines.join("\n")
}
