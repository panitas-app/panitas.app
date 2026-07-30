import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode"

export type FacingMode = "environment" | "user"

export const ScannerEngine = {
  /**
   * Crea una nueva instancia de Html5Qrcode asociada a un div id
   */
  create(elementId: string): Html5Qrcode {
    const formats = [
      Html5QrcodeSupportedFormats.EAN_13,
      Html5QrcodeSupportedFormats.EAN_8,
      Html5QrcodeSupportedFormats.CODE_128,
      Html5QrcodeSupportedFormats.CODE_39,
      Html5QrcodeSupportedFormats.UPC_A,
      Html5QrcodeSupportedFormats.UPC_E,
      Html5QrcodeSupportedFormats.ITF,
      Html5QrcodeSupportedFormats.QR_CODE,
      Html5QrcodeSupportedFormats.DATA_MATRIX,
    ].filter((f) => f !== undefined)

    return new Html5Qrcode(elementId, {
      formatsToSupport: formats,
      verbose: false,
    })
  },

  /**
   * Inicia el escaneo usando un deviceId específico.
   */
  async start(
    scanner: Html5Qrcode,
    deviceId: string,
    onScanSuccess: (decodedText: string) => void
  ): Promise<void> {
    const config = {
      fps: 25,
      qrbox: (w: number, h: number) => {
        const vw = w || 300
        const vh = h || 300
        return {
          width: Math.floor(Math.max(Math.min(vw * 0.9, 360), 240)),
          height: Math.floor(Math.max(Math.min(vh * 0.5, 200), 140)),
        }
      },
    }

    // Retorna la promesa, si falla lanza el error, no hay reintentos aquí.
    await scanner.start(
      deviceId,
      config,
      onScanSuccess,
      () => {} // Ignorar callbacks de errores de frame individuales
    )
  },

  /**
   * Aplica nivel de zoom a la transmisión de video activa si el dispositivo lo permite
   */
  async setZoom(scanner: Html5Qrcode, zoomValue: number): Promise<boolean> {
    try {
      if (!scanner.isScanning) return false
      const capabilities = (scanner as any).getRunningTrackCapabilities ? (scanner as any).getRunningTrackCapabilities() : {}
      if (capabilities && capabilities.zoom) {
        await (scanner as any).applyVideoConstraints({
          advanced: [{ zoom: zoomValue }]
        })
        return true
      }
      // Intento alternativo directo en el stream video track
      const videoEl = document.querySelector("#scanner-viewport video") as HTMLVideoElement
      if (videoEl && videoEl.srcObject) {
        const stream = videoEl.srcObject as MediaStream
        const track = stream.getVideoTracks()[0]
        if (track && track.applyConstraints) {
          await track.applyConstraints({ advanced: [{ zoom: zoomValue }] as any })
          return true
        }
      }
    } catch (e) {
      console.warn("[ScannerEngine] Error al aplicar zoom:", e)
    }
    return false
  },

  /**
   * Detiene el escáner y limpia el DOM
   */
  async stop(scanner: Html5Qrcode): Promise<void> {
    try {
      if (scanner.isScanning) {
        await scanner.stop()
      }
    } catch (e) {
      console.error("[ScannerEngine] Error en stop:", e)
    }
  },
  
  /**
   * Limpia recursos (ideal para llamar después de stop)
   */
  destroy(scanner: Html5Qrcode): void {
    try {
      scanner.clear()
    } catch (e) {
      console.error("[ScannerEngine] Error en clear:", e)
    }
  }
}
