import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { validateFileUpload, isImageMime, isVideoMime } from "@/lib/file-validate"
import { rateLimit, getClientIp } from "@/lib/rate-limit"
import { uploadToCloudinary } from "@/lib/cloudinary"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const ip = getClientIp(request)
    const rl = await rateLimit(`upload:${session.user.id}:${ip}`, 20, 60 * 1000)
    if (!rl.success) {
      return NextResponse.json(
        { error: `Demasiadas subidas. Intenta de nuevo en ${Math.ceil(rl.resetIn / 1000)}s` },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetIn / 1000)) } }
      )
    }

    const data = await request.formData()
    const file: File | null = data.get("file") as unknown as File

    if (!file) {
      return NextResponse.json({ error: "No se subió ningún archivo" }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const validation = validateFileUpload({ name: file.name, type: file.type, size: file.size }, buffer)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.reason || "Archivo no válido" }, { status: 400 })
    }

    const detectedMime = validation.detectedMime!
    const isVideo = isVideoMime(detectedMime)

    const url = await uploadToCloudinary(buffer, {
      folder: `panitas/${session.user.id}`,
      ...(isVideo ? { resourceType: "video" as const } : {}),
    })

    return NextResponse.json({ url, mime: detectedMime, size: file.size })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
