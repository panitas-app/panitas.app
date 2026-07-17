const { v2: cloudinary } = require("cloudinary")
const { readFileSync, statSync } = require("fs")
const { join, basename } = require("path")

const envUrl = process.env.CLOUDINARY_URL
if (!envUrl) { console.error("CLOUDINARY_URL not set"); process.exit(1) }
const match = envUrl.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/)
if (!match) { console.error("CLOUDINARY_URL invalid"); process.exit(1) }
cloudinary.config({ cloud_name: match[3], api_key: match[1], api_secret: match[2], secure: true })

const videoDir = join(__dirname, "..", "public", "videos", "plans")

async function uploadOne(plan, file) {
  const filePath = join(videoDir, plan, file)
  const publicId = `${plan}/${basename(file, ".mp4")}`
  const size = statSync(filePath).size
  console.log(`Uploading ${publicId} (${(size / 1e6).toFixed(1)}MB)...`)
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: "panitas/videos/plans",
      public_id: publicId,
      resource_type: "video",
    })
    console.log(`  OK: ${result.secure_url}`)
    return result
  } catch (e) {
    console.error(`  Error: ${e.message}`)
    return null
  }
}

const plan = process.argv[2]
const file = process.argv[3]
if (!plan || !file) { console.error("Usage: node upload-one.js <plan> <file.mp4>"); process.exit(1) }
uploadOne(plan, file).then(() => process.exit(0))
