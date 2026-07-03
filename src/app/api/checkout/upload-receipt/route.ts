import { NextRequest, NextResponse } from "next/server"
import { rateLimit, getClientIp } from "@/lib/rate-limit"
import { csrfGuard } from "@/lib/csrf"
import { validateFileUpload } from "@/lib/file-validate"
import { safeErrorResponse } from "@/lib/api-errors"
import { uploadToCloudinary } from "@/lib/cloudinary"

const MAX_FILE_SIZE = 3 * 1024 * 1024

export async function POST(request: NextRequest) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf

  try {
    const ip = getClientIp(request)
    const rl = await rateLimit(`upload-receipt:${ip}`, 5, 30 * 60 * 1000)
    if (!rl.success) {
      return NextResponse.json(
        { error: "Demasiadas cargas de archivos. Intenta de nuevo en 30 minutos." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetIn / 1000)) } }
      )
    }

    const data = await request.formData()
    const file: File | null = data.get("file") as unknown as File

    if (!file) {
      return NextResponse.json({ error: "No se subió ningún archivo" }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({
        error: `El archivo excede el límite de ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const validation = validateFileUpload({ name: file.name, type: file.type, size: file.size }, buffer)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.reason || "Archivo no válido" }, { status: 400 })
    }

    const url = await uploadToCloudinary(buffer, { folder: "panitas/receipts" })

    return NextResponse.json({
      url,
      remainingUploads: rl.remaining,
    })
  } catch (error) {
    return safeErrorResponse(error, "Error al subir tu comprobante de pago")
  }
}
