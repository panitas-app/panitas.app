import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    if (!token || token.length > 128) {
      return NextResponse.json({ error: "Token inválido" }, { status: 400 })
    }

    const delivery = await prisma.digitalDelivery.findUnique({
      where: { token },
      include: {
        orderItem: {
          include: {
            product: {
              include: { digitalProduct: true },
            },
          },
        },
      },
    })

    if (!delivery) {
      return NextResponse.json({ error: "Enlace no encontrado" }, { status: 404 })
    }

    if (delivery.expiresAt && delivery.expiresAt < new Date()) {
      return NextResponse.json({ error: "Este enlace ha expirado" }, { status: 410 })
    }

    if (delivery.maxDownloads > 0 && delivery.downloadCount >= delivery.maxDownloads) {
      return NextResponse.json({ error: "Límite de descargas alcanzado" }, { status: 410 })
    }

    const digitalProduct = delivery.orderItem.product?.digitalProduct
    if (!digitalProduct?.fileUrl) {
      return NextResponse.json({ error: "Archivo no disponible" }, { status: 404 })
    }

    const now = new Date()
    const isFirstDownload = delivery.downloadCount === 0

    await prisma.digitalDelivery.update({
      where: { id: delivery.id },
      data: {
        downloadCount: { increment: 1 },
        lastDownloadedAt: now,
        ...(isFirstDownload ? { firstDownloadedAt: now } : {}),
      },
    })

    return NextResponse.redirect(digitalProduct.fileUrl, 302)
  } catch (error: any) {
    console.error("[download error]", error)
    return NextResponse.json({ error: "Error al procesar la descarga" }, { status: 500 })
  }
}
