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
      fps: 20,
      qrbox: (w: number, h: number) => {
        const vw = w || 300
        const vh = h || 300
        return {
          width: Math.floor(Math.max(Math.min(vw * 0.85, 340), 220)),
          height: Math.floor(Math.max(Math.min(vh * 0.45, 180), 120)),
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
