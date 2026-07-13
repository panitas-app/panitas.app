"use client"

import { useEffect, useRef, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Download, Share2, X, QrCode } from "lucide-react"
import { toast } from "sonner"

interface QRModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  storeUrl: string
  storeName: string
}

export function QRModal({ open, onOpenChange, storeUrl, storeName }: QRModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [qrDataUrl, setQrDataUrl] = useState("")

  useEffect(() => {
    if (!open) return
    import("qrcode").then((QRCode) => {
      QRCode.toCanvas(canvasRef.current!, storeUrl, {
        width: 280,
        margin: 2,
        color: { dark: "#102A43", light: "#ffffff" },
      }, (err) => {
        if (!err && canvasRef.current) {
          setQrDataUrl(canvasRef.current.toDataURL("image/png"))
        }
      })
    })
  }, [open, storeUrl])

  async function handleDownload() {
    if (!qrDataUrl) return
    const link = document.createElement("a")
    link.download = `QR-${storeName.replace(/\s+/g, "-")}.png`
    link.href = qrDataUrl
    link.click()
    toast.success("QR descargado")
  }

  async function handleShare() {
    if (!qrDataUrl) return
    try {
      const blob = await (await fetch(qrDataUrl)).blob()
      const file = new File([blob], `QR-${storeName.replace(/\s+/g, "-")}.png`, { type: "image/png" })
      if (navigator.share) {
        await navigator.share({ title: storeName, files: [file] })
      } else {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ])
        toast.success("QR copiado al portapapeles")
      }
    } catch {
      toast.error("No se pudo compartir el QR")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <QrCode className="size-5" />
            QR de {storeName}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-6 py-4">
          <div className="rounded-2xl bg-muted p-3 shadow-sm">
            <canvas ref={canvasRef} className="size-[280px]" />
          </div>
          <div className="flex gap-3 w-full">
            <Button
              variant="outline"
              className="flex-1 gap-2 rounded-xl"
              onClick={handleDownload}
            >
              <Download className="size-4" />
              Descargar
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-2 rounded-xl"
              onClick={handleShare}
            >
              <Share2 className="size-4" />
              Compartir
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
