"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Smartphone } from "lucide-react"
import type { ScannerStatus } from "./types"

interface ScannerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  status: ScannerStatus
  device: string
  qrCanvasRef: React.RefObject<HTMLCanvasElement | null>
  onRetry: () => void
  onDisconnect: () => void
}

export function ScannerModal({ open, onOpenChange, status, device, qrCanvasRef, onRetry, onDisconnect }: ScannerModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="size-5" />
            {status === "connected" ? "Lector conectado" : "Usar teléfono como lector"}
          </DialogTitle>
        </DialogHeader>

        {status === "connecting" ? (
          <div className="flex flex-col items-center py-8 text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm font-medium">Creando sesión...</p>
          </div>
        ) : status === "error" ? (
          <div className="flex flex-col items-center py-8 text-center">
            <p className="text-red-500 text-sm font-medium mb-1">Error al crear la sesión</p>
            <p className="text-xs text-muted-foreground mb-4">Verifica tu conexión e intenta de nuevo</p>
            <Button size="sm" onClick={onRetry}>Reintentar</Button>
          </div>
        ) : status === "connected" ? (
          <div className="py-4 space-y-3 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
              <Smartphone className="size-8 text-green-600" />
            </div>
            <div>
              <p className="font-semibold">Teléfono conectado</p>
              <p className="text-sm text-muted-foreground">{device}</p>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Escaneando...
            </div>
            <Button size="sm" className="w-full" onClick={onDisconnect}>
              Terminar de escanear
            </Button>
          </div>
        ) : (
          <div className="py-4 space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              Escanea este código QR con la cámara de tu teléfono para usarlo como lector de códigos de barras.
            </p>
            <div className="flex justify-center">
              <canvas ref={qrCanvasRef} className="rounded-lg border border-border" />
            </div>
            <p className="text-xs text-muted-foreground">
              La sesión expira en 5 minutos
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" size="sm" onClick={onDisconnect}>Cancelar</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
