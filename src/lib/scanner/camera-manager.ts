export interface CameraDevice {
  deviceId: string
  label: string
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
