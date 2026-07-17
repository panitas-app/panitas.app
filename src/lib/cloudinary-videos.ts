const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dxgqv585u"

export interface VideoTransformOptions {
  width?: number
  quality?: "auto" | number
  format?: "auto" | "mp4" | "webm" | "av1"
  dpr?: "auto" | number
}

export function getVideoUrl(publicId: string, options?: VideoTransformOptions): string {
  const transformations: string[] = []

  // Format auto - serves best format for browser (WebM/AV1/MP4)
  transformations.push(`f_${options?.format || "auto"}`)

  // Quality auto - adapts to content complexity
  transformations.push(`q_${options?.quality || "auto"}`)

  // DPR auto - adapts to device pixel ratio
  transformations.push(`dpr_${options?.dpr || "auto"}`)

  // Width constraint (optional)
  if (options?.width) {
    transformations.push(`w_${options.width}`)
  }

  const tf = transformations.join(",")
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/video/upload/${tf}/${publicId}`
}

export function getVideoPosterUrl(publicId: string, options?: { width?: number; quality?: number }): string {
  const transformations: string[] = []
  transformations.push("f_webp")
  transformations.push(`q_${options?.quality || 60}`)
  if (options?.width) transformations.push(`w_${options.width}`)
  else transformations.push("w_400")

  const tf = transformations.join(",")
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/video/upload/${tf}/${publicId}.jpg`
}

export const PLAN_VIDEOS = {
  agenda: [
    getVideoUrl("panitas/videos/plans/agenda/agenda1"),
    getVideoUrl("panitas/videos/plans/agenda/agenda2"),
    getVideoUrl("panitas/videos/plans/agenda/agenda3"),
  ],
  emprendedor: [
    getVideoUrl("panitas/videos/plans/emprendedor/emprendedor1"),
    getVideoUrl("panitas/videos/plans/emprendedor/emprendedor2"),
    getVideoUrl("panitas/videos/plans/emprendedor/emprendedor3"),
  ],
  mayorista: [
    getVideoUrl("panitas/videos/plans/mayorista/mayorista1"),
    getVideoUrl("panitas/videos/plans/mayorista/mayorista2"),
    getVideoUrl("panitas/videos/plans/mayorista/mayorista3"),
  ],
}
