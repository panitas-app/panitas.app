export interface CameraDevice {
  deviceId: string
  label: string
}

export interface CameraInfo {
  stream: MediaStream
  deviceId: string
  label: string
  width: number
  height: number
}

export const CameraManager = {
  /**
   * Verifica si el contexto actual es seguro (HTTPS o localhost)
   */
  isSecureContext(): boolean {
    return typeof window !== "undefined" && window.isSecureContext
  },

  /**
   * Verifica si el navegador soporta mediaDevices
   */
  isSupported(): boolean {
    return typeof navigator !== "undefined" && !!navigator.mediaDevices && !!navigator.mediaDevices.enumerateDevices
  },

  /**
   * Lista todas las cámaras de video disponibles (sin pedir permisos, solo enumera)
   */
  async getCameras(): Promise<CameraDevice[]> {
    if (!this.isSupported()) return []
    
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      return devices
        .filter(d => d.kind === "videoinput")
        .map(d => ({
          deviceId: d.deviceId,
          label: d.label || "Cámara",
        }))
    } catch (e) {
      console.error("[CameraManager] Error al enumerar dispositivos:", e)
      return []
    }
  },

  /**
   * Verifica si hay al menos una cámara disponible
   */
  async hasCameras(): Promise<boolean> {
    const cameras = await this.getCameras()
    return cameras.length > 0
  },

  /**
   * Abre la cámara para validar permisos y obtener el deviceId real.
   * Único punto en toda la app que debe llamar getUserMedia.
   */
  async openCamera(preferRear: boolean): Promise<CameraInfo> {
    const constraints: MediaStreamConstraints = {
      video: preferRear
        ? { facingMode: { ideal: "environment" } }
        : { facingMode: { ideal: "user" } }
    }

    const stream = await navigator.mediaDevices.getUserMedia(constraints)

    const tracks = stream.getVideoTracks()
    if (tracks.length === 0) {
      stream.getTracks().forEach(t => t.stop())
      throw new Error("El stream no contiene pistas de video")
    }

    const track = tracks[0]
    const settings = track.getSettings()

    return {
      stream,
      deviceId: settings.deviceId || "",
      label: track.label || "Cámara desconocida",
      width: settings.width || 0,
      height: settings.height || 0,
    }
  },

  /**
   * Obtiene las capacidades de zoom de una pista de video si están soportadas
   */
  getZoomCapabilities(stream: MediaStream): { supported: boolean; min: number; max: number; step: number; current: number } {
    try {
      const track = stream.getVideoTracks()[0]
      if (!track) return { supported: false, min: 1, max: 1, step: 0.1, current: 1 }
      const capabilities = track.getCapabilities ? (track.getCapabilities() as any) : {}
      const settings = track.getSettings ? (track.getSettings() as any) : {}
      if (capabilities.zoom) {
        return {
          supported: true,
          min: capabilities.zoom.min || 1,
          max: capabilities.zoom.max || 4,
          step: capabilities.zoom.step || 0.1,
          current: settings.zoom || 1,
        }
      }
    } catch (e) {
      console.warn("[CameraManager] Error al consultar capacidades de zoom:", e)
    }
    return { supported: false, min: 1, max: 1, step: 0.1, current: 1 }
  },

  /**
   * Aplica un nivel de zoom a la pista de video
   */
  async applyZoom(stream: MediaStream, zoomValue: number): Promise<boolean> {
    try {
      const track = stream.getVideoTracks()[0]
      if (!track || !track.applyConstraints) return false
      await track.applyConstraints({
        advanced: [{ zoom: zoomValue }] as any
      })
      return true
    } catch (e) {
      console.warn("[CameraManager] Error al aplicar zoom:", e)
      return false
    }
  },

  /**
   * Cierra el stream liberando el hardware
   */
  closeCamera(stream: MediaStream): void {
    if (!stream) return
    stream.getTracks().forEach(t => {
      t.stop()
    })
  },

  /**
   * Clasifica un error de Html5Qrcode a un mensaje legible para el usuario
   */
  classifyError(err: any): string {
    const errName = err?.name || "Error"
    const errMsg = String(err?.message || err).toLowerCase()

    if (errName === "NotAllowedError" || errMsg.includes("permission denied")) {
      return "Permiso de cámara rechazado. Toca el candado 🔒 arriba para dar permiso."
    }
    if (errName === "NotReadableError" || errMsg.includes("could not start video source")) {
      return "La cámara está ocupada por otra aplicación. Ciérrala e intenta de nuevo."
    }
    if (errName === "NotFoundError" || errMsg.includes("requested device not found")) {
      return "No se encontró ningún sensor de cámara en tu dispositivo."
    }
    if (errName === "OverconstrainedError") {
      return "La cámara no soporta esta configuración. Intenta usar la cámara frontal."
    }
    
    return `Error al acceder a la cámara [${errName}]: ${errMsg}`
  }
}
