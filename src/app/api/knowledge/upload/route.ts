import { NextResponse, type NextRequest } from "next/server"
import { csrfGuard } from "@/lib/csrf"
import { createKnowledgeService, extractTextFromBuffer } from "@/lib/knowledge"
import { validateFileUpload } from "@/lib/file-validate"
import { requireKnowledgeStore, knowledgeErrorResponse } from "../_helpers"

const knowledge = createKnowledgeService({ source: "api.knowledge.upload" })

/**
 * POST /api/knowledge/upload  (multipart/form-data)
 *   Sube un documento (PDF/DOCX/TXT, máx. 10MB), extrae el texto y crea el
 *   documento en la Base de Conocimiento. Campos opcionales: title, type,
 *   summary, categoryIds[], tagIds[], status.
 */
export async function POST(request: NextRequest) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf

  try {
    const current = await requireKnowledgeStore()
    if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const formData = await request.formData().catch(() => null)
    if (!formData) return NextResponse.json({ error: "Formulario inválido" }, { status: 400 })

    const file = formData.get("file")
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Sube un archivo PDF, DOCX o TXT" }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const validation = validateFileUpload({ name: file.name, type: file.type, size: file.size }, buffer)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.reason ?? "Archivo no válido" }, { status: 400 })
    }

    // Extracción best-effort: si el texto no se puede extraer, se indexa el
    // documento original con metadatos y contenido vacío.
    const extracted = extractTextFromBuffer(buffer, {
      mime: validation.detectedMime,
      extension: validation.extension,
    })
    const content = extracted.text ?? ""

    const asJson = (key: string): string[] | undefined => {
      const raw = formData.get(key)
      if (!raw) return undefined
      try {
        const parsed = JSON.parse(String(raw))
        return Array.isArray(parsed) ? parsed.filter((v: unknown): v is string => typeof v === "string") : undefined
      } catch {
        return undefined
      }
    }

    const document = await knowledge.createDocument(current.ctx, {
      title: (formData.get("title") as string | null) ?? undefined,
      content,
      summary: (formData.get("summary") as string | null) ?? undefined,
      type: (formData.get("type") as string | null) ?? "pdf",
      status: (formData.get("status") as string | null) ?? "published",
      source: "upload",
      fileName: file.name,
      fileType: validation.detectedMime ?? file.type,
      fileSize: file.size,
      categoryIds: asJson("categoryIds") ?? [],
      tagIds: asJson("tagIds") ?? [],
    })

    return NextResponse.json({ document, extracted: extracted.text !== null }, { status: 201 })
  } catch (error: unknown) {
    return knowledgeErrorResponse(error, "Error al subir el documento")
  }
}
