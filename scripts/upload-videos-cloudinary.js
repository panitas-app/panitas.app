const { v2: cloudinary } = require("cloudinary")
const { readdirSync, readFileSync, statSync } = require("fs")
const { join, extname, basename } = require("path")

// Parse CLOUDINARY_URL
const envUrl = process.env.CLOUDINARY_URL || ""
const match = envUrl.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/)
if (!match) {
  console.error("CLOUDINARY_URL not set or invalid")
  process.exit(1)
}
cloudinary.config({
  cloud_name: match[3],
  api_key: match[1],
  api_secret: match[2],
  secure: true,
})

const videoDir = join(__dirname, "..", "public", "videos", "plans")
const plans = ["agenda", "emprendedor", "mayorista"]

async function uploadVideo(filePath, publicId) {
  const size = statSync(filePath).size
  console.log(`Uploading ${publicId} (${(size / 1e6).toFixed(1)}MB)...`)

  try {
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: "panitas/videos/plans",
          public_id: publicId,
          resource_type: "video",
          eager: [
            { format: "mp4", quality: "auto", width: 480 },
            { format: "mp4", quality: "auto", width: 720 },
            { format: "mp4", quality: "auto", width: 1080 },
            { format: "webm", quality: "auto", width: 720 },
          ],
          eager_async: true,
        },
        (error, result) => {
          if (error) reject(error)
          else resolve(result)
        }
      )
    })
    console.log(`  OK: ${result.secure_url}`)
    return result
  } catch (e) {
    console.error(`  Error: ${e.message}`)
    return null
  }
}

async function main() {
  console.log("=== Cloudinary Video Upload ===\n")

  for (const plan of plans) {
    const dir = join(videoDir, plan)
    try {
      const files = readdirSync(dir).filter((f) => extname(f) === ".mp4")
      for (const file of files) {
        const filePath = join(dir, file)
        const publicId = `${plan}/${basename(file, ".mp4")}`
        await uploadVideo(filePath, publicId)
      }
    } catch (e) {
      console.error(`Error processing ${plan}: ${e.message}`)
    }
  }

  console.log("\n=== Upload complete ===")
  console.log("\nVideo URLs (add to .env):")
  console.log("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=dxgqv585u")

  // Generate URLs for reference
  for (const plan of plans) {
    const dir = join(videoDir, plan)
    try {
      const files = readdirSync(dir).filter((f) => extname(f) === ".mp4")
      for (const file of files) {
        const publicId = `panitas/videos/plans/${plan}/${basename(file, ".mp4")}`
        const url = cloudinary.url(publicId, {
          resource_type: "video",
          format: "auto",
          quality: "auto",
          dpr: "auto",
        })
        console.log(`  ${plan}/${basename(file, ".mp4")}: ${url}`)
      }
    } catch (e) {}
  }
}

main().catch(console.error)
