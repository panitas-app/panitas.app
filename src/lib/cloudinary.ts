import { v2 as cloudinary } from "cloudinary"

function parseCloudinaryUrl(url: string) {
  const match = url.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/)
  if (!match) throw new Error("CLOUDINARY_URL malformada")
  return { api_key: match[1], api_secret: match[2], cloud_name: match[3] }
}

const envUrl = process.env.CLOUDINARY_URL || ""
const parsed = parseCloudinaryUrl(envUrl)
cloudinary.config({
  cloud_name: parsed.cloud_name,
  api_key: parsed.api_key,
  api_secret: parsed.api_secret,
  secure: true,
})

export async function uploadToCloudinary(
  buffer: Buffer,
  options?: { folder?: string; publicId?: string; resourceType?: "auto" | "image" | "video" | "raw" }
): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: options?.folder || "panitas",
        public_id: options?.publicId,
        resource_type: options?.resourceType || "auto",
      },
      (error, result) => {
        if (error) return reject(error)
        resolve(result!.secure_url)
      }
    )
    stream.end(buffer)
  })
}

export async function deleteFromCloudinary(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId)
}

export function getPublicIdFromUrl(url: string): string | null {
  const parts = url.split("/")
  const uploadIndex = parts.indexOf("upload")
  if (uploadIndex === -1) return null
  return parts.slice(uploadIndex + 2).join("/").replace(/\.[^.]+$/, "")
}

export { cloudinary }
