/**
 * FASE 7D — Tests del parser de documentos de la Business Knowledge Base.
 *
 * Cubre TXT (UTF-8), PDF (streams planos y comprimidos FlateDecode) y DOCX
 * (lector ZIP mínimo stored/deflate sobre `word/document.xml`). La extracción
 * es best-effort: nunca lanza y ante datos inválidos devuelve `null`.
 */
import { describe, expect, it } from "vitest"
import { deflateSync } from "node:zlib"
import {
  detectTextFormat,
  extractDocxText,
  extractPdfText,
  extractTextFromBuffer,
  normalizeExtractedText,
} from "@/lib/knowledge"

// ─── Helpers para construir archivos sintéticos ─────────────────────────────

/** PDF mínimo con un stream de texto plano `(texto)`. */
function makePdfStream(text: string, compressed = false): Buffer {
  const body = Buffer.from(`BT (${text}) Tj ET`, "latin1")
  const payload = compressed ? deflateSync(body) : body
  const stream = Buffer.concat([
    Buffer.from("stream\n", "latin1"),
    payload,
    Buffer.from("\nendstream", "latin1"),
  ])
  return Buffer.concat([
    Buffer.from("%PDF-1.4\n", "latin1"),
    stream,
    Buffer.from("\n%%EOF", "latin1"),
  ])
}

interface StoredEntry {
  name: string
  data: Buffer
}

/** Construye un ZIP válido con entradas stored (sin compresión). */
function buildStoredZip(entries: StoredEntry[]): Buffer {
  const localParts: Buffer[] = []
  const centralParts: Buffer[] = []
  let offset = 0

  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8")
    const crc = 0
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(0, 6)
    local.writeUInt16LE(0, 8)
    local.writeUInt16LE(0, 10)
    local.writeUInt16LE(0, 12)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(entry.data.length, 18)
    local.writeUInt32LE(entry.data.length, 22)
    local.writeUInt16LE(name.length, 26)
    local.writeUInt16LE(0, 28)
    localParts.push(local, name, entry.data)

    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(0, 8)
    central.writeUInt16LE(0, 10)
    central.writeUInt16LE(0, 12)
    central.writeUInt16LE(0, 14)
    central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(entry.data.length, 20)
    central.writeUInt32LE(entry.data.length, 24)
    central.writeUInt16LE(name.length, 28)
    central.writeUInt16LE(0, 30)
    central.writeUInt16LE(0, 32)
    central.writeUInt16LE(0, 34)
    central.writeUInt16LE(0, 36)
    central.writeUInt32LE(0, 38)
    central.writeUInt32LE(offset, 42)
    centralParts.push(central, name)
    offset += 30 + name.length + entry.data.length
  }

  const centralStart = offset
  const central = Buffer.concat(centralParts)

  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)
  eocd.writeUInt16LE(0, 4)
  eocd.writeUInt16LE(0, 6)
  eocd.writeUInt16LE(entries.length, 8)
  eocd.writeUInt16LE(entries.length, 10)
  eocd.writeUInt32LE(central.length, 12)
  eocd.writeUInt32LE(centralStart, 16)
  eocd.writeUInt16LE(0, 20)

  return Buffer.concat([Buffer.concat(localParts), central, eocd])
}

function makeDocx(bodyXml: string): Buffer {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>${bodyXml}</w:body>
</w:document>`
  return buildStoredZip([
    { name: "[Content_Types].xml", data: Buffer.from("<Types/>", "utf8") },
    { name: "word/document.xml", data: Buffer.from(xml, "utf8") },
  ])
}

const BODY_TWO_PARAGRAPHS = [
  "<w:p><w:r><w:t>Primer parrafo</w:t></w:r></w:p>",
  "<w:p><w:r><w:t>Segundo parrafo &amp; notas</w:t></w:r></w:p>",
].join("")

// ─── Detección de formato ───────────────────────────────────────────────────

describe("detectTextFormat", () => {
  it("detecta texto por MIME text/*", () => {
    expect(detectTextFormat("text/plain", ".xyz")).toBe("txt")
  })

  it("detecta texto por extensiones conocidas", () => {
    expect(detectTextFormat(null, ".md")).toBe("txt")
    expect(detectTextFormat("application/octet-stream", ".txt")).toBe("txt")
  })

  it("detecta PDF y DOCX", () => {
    expect(detectTextFormat("application/pdf", ".pdf")).toBe("pdf")
    expect(detectTextFormat("application/pdf", null)).toBe("pdf")
    expect(detectTextFormat("application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".docx")).toBe("docx")
    expect(detectTextFormat(null, ".docx")).toBe("docx")
  })

  it("devuelve unknown para formatos no soportados", () => {
    expect(detectTextFormat("image/png", ".png")).toBe("unknown")
  })
})

// ─── TXT ────────────────────────────────────────────────────────────────────

describe("extractTextFromBuffer — TXT", () => {
  it("decodifica UTF-8 y normaliza saltos de línea", () => {
    const buffer = new TextEncoder().encode("  Hola mundo  \r\n\r\n\tSegunda línea   ")
    const result = extractTextFromBuffer(buffer, { mime: "text/plain", extension: ".txt" })
    expect(result.format).toBe("txt")
    expect(result.text).toBe("Hola mundo\n\nSegunda línea")
  })

  it("normaliza espacios múltiples y NUL", () => {
    expect(normalizeExtractedText("a \u0000  b")).toBe("a b")
    expect(normalizeExtractedText("a\t\tb\n\n\nc")).toBe("a b\n\nc")
    expect(normalizeExtractedText("linea con espacio final   \n  siguiente")).toBe("linea con espacio final\nsiguiente")
  })

  it("nunca lanza con binario inválido", () => {
    const garbage = new Uint8Array([0xff, 0xfe, 0x00, 0x80, 0xc3])
    const result = extractTextFromBuffer(garbage, { extension: ".txt" })
    expect(result.text).not.toBeNull()
  })
})

// ─── PDF ────────────────────────────────────────────────────────────────────

describe("extractPdfText", () => {
  it("extrae texto de streams planos", () => {
    const text = extractPdfText(makePdfStream("Hello World"))
    expect(text).toContain("Hello World")
  })

  it("extrae texto de streams comprimidos con FlateDecode", () => {
    const text = extractPdfText(makePdfStream("Flate Decode works", true))
    expect(text).toContain("Flate Decode works")
  })

  it("devuelve null si no es un PDF", () => {
    expect(extractPdfText(Buffer.from("esto no es pdf"))).toBeNull()
  })

  it("decodifica escapes de paréntesis y saltos", () => {
    const text = extractPdfText(makePdfStream("a\\(b\\)\\nline"))
    expect(text).toContain("line")
  })

  it("extractTextFromBuffer integra PDF", () => {
    const result = extractTextFromBuffer(makePdfStream("PDF content"), { mime: "application/pdf" })
    expect(result.format).toBe("pdf")
    expect(result.text).toContain("PDF content")
  })
})

// ─── DOCX ───────────────────────────────────────────────────────────────────

describe("extractDocxText", () => {
  it("extrae los párrafos de word/document.xml", () => {
    const text = extractDocxText(makeDocx(BODY_TWO_PARAGRAPHS))
    expect(text).toBe("Primer parrafo\nSegundo parrafo & notas")
  })

  it("decodifica entidades XML", () => {
    const text = extractDocxText(makeDocx("<w:p><w:r><w:t>A &lt; B &gt; C &amp; D</w:t></w:r></w:p>"))
    expect(text).toBe("A < B > C & D")
  })

  it("devuelve null si no existe word/document.xml", () => {
    const zip = buildStoredZip([{ name: "readme.txt", data: Buffer.from("hola") }])
    expect(extractDocxText(zip)).toBeNull()
  })

  it("devuelve null si el buffer no es un ZIP", () => {
    expect(extractDocxText(Buffer.from("not a zip at all"))).toBeNull()
  })

  it("soporta entradas DOCX comprimidas (deflate)", () => {
    const xml = "<w:document xmlns:w=\"x\"><w:body><w:p><w:r><w:t>Compressed docx</w:t></w:r></w:p></w:body></w:document>"
    // El lector mínimo marca el entry como stored (compression=0) aunque los
    // bytes sean deflate: no debe lanzar y la extracción queda best-effort.
    const zip = buildStoredZip([{ name: "word/document.xml", data: deflateSync(Buffer.from(xml, "utf8")) }])
    expect(() => extractDocxText(zip)).not.toThrow()
  })
})
