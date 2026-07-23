"use client"

import { useRef, useEffect, useState } from "react"
import QRCode from "qrcode"
import { toPng } from "html-to-image"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Download, X } from "lucide-react"
import { toast } from "sonner"

interface QrModalProps {
  open: boolean
  onClose: () => void
  storeName: string
  storeUrl: string
  storeLogo?: string | null
}

export function QrModal({ open, onClose, storeName, storeUrl, storeLogo }: QrModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    if (!open || !canvasRef.current) return
    const canvas = canvasRef.current
    QRCode.toCanvas(canvas, storeUrl, {
      width: 180,
      margin: 1,
      color: { dark: "#000000", light: "#ffffff" },
    }, (err) => {
      if (err) console.error(err)
    })
  }, [open, storeUrl])

  async function handleDownload() {
    if (!cardRef.current) return
    setDownloading(true)
    try {
      const dataUrl = await toPng(cardRef.current, { quality: 1, pixelRatio: 2 })
      const link = document.createElement("a")
      link.download = `qr-${storeName.toLowerCase().replace(/\s+/g, "-")}.png`
      link.href = dataUrl
      link.click()
      toast.success("QR descargado")
    } catch {
      toast.error("Error al descargar QR")
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent showCloseButton={false} className="sm:max-w-sm p-0 gap-0 overflow-hidden rounded-3xl border-0 bg-transparent shadow-none [background:transparent!important] [backdrop-filter:none!important]">
        <DialogHeader className="sr-only">
          <DialogTitle>QR de {storeName}</DialogTitle>
        </DialogHeader>

        <div
          ref={cardRef}
          className="relative overflow-hidden rounded-3xl flex flex-col items-center"
          style={{
            background: "linear-gradient(160deg, #0A2540 0%, #1A3A6B 35%, #0F2B50 70%, #091E3A 100%)",
            boxShadow: "0 20px 60px rgba(0, 20, 50, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
          }}
        >
          {/* Liquid glass shine layers */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.06] to-transparent" />
          <div className="pointer-events-none absolute -top-24 -right-24 size-60 rounded-full bg-blue-400/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 size-48 rounded-full bg-blue-300/8 blur-3xl" />
          <div className="pointer-events-none absolute top-1/3 left-1/2 size-32 rounded-full bg-white/5 blur-2xl" />
          <div className="pointer-events-none absolute top-0 left-1/4 w-1/2 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          {/* Panitas logo */}
          <div className="relative z-10 pt-10 pb-3 flex items-center justify-center">
            <img
              src="/logo.png"
              alt="Panitas"
              className="h-9 w-auto"
            />
          </div>

          {/* Divider line */}
          <div className="relative z-10 w-16 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          {/* QR Code */}
          <div className="relative z-10 my-6 rounded-2xl bg-white/10 p-3 ring-1 ring-white/15">
            <div className="rounded-xl bg-white p-3.5 shadow-lg">
              <canvas ref={canvasRef} width={180} height={180} className="block" />
            </div>
          </div>

          {/* Divider line */}
          <div className="relative z-10 w-16 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          {/* Store name and tagline */}
          <div className="relative z-10 pt-4 pb-10 text-center px-8">
            <p
              className="text-xl font-bold text-white tracking-tight"
              style={{ fontFamily: "Inter, system-ui, sans-serif", letterSpacing: "-0.03em" }}
            >
              {storeName}
            </p>
            <p className="text-xs text-white/50 mt-1.5 font-medium tracking-[0.15em] uppercase">
              Este QR es Panita
            </p>
          </div>
        </div>

        {/* Close & Download buttons */}
        <div className="flex gap-2 mt-4 px-1">
          <Button
            onClick={handleDownload}
            disabled={downloading}
            className="flex-1 gap-2 h-11 rounded-xl bg-white/10 text-white border border-white/20 hover:bg-white/20 backdrop-blur-md transition-all active:scale-[0.97]"
          >
            <Download className="size-4" />
            {downloading ? "Descargando..." : "Descargar QR"}
          </Button>
          <Button
            onClick={onClose}
            variant="ghost"
            className="size-11 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-all"
          >
            <X className="size-5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
