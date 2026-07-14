const { execSync } = require("child_process")
const { readdirSync, statSync, existsSync, unlinkSync, renameSync } = require("fs")
const { join, extname } = require("path")

const ffmpeg = require("@ffmpeg-installer/ffmpeg").path
const inputDir = join(__dirname, "..", "public", "videos", "plans")
const plans = ["agenda", "emprendedor", "mayorista"]

for (const plan of plans) {
  const dir = join(inputDir, plan)
  if (!existsSync(dir)) continue
  const files = readdirSync(dir).filter((f) => extname(f) === ".mp4" && !f.startsWith("."))
  for (const file of files) {
    const inputPath = join(dir, file)
    const sizeBefore = statSync(inputPath).size
    const tmpPath = join(dir, `__tmp_${file}`)
    const outPath = join(dir, file)
    console.log(`Comprimiendo ${plan}/${file} (${(sizeBefore / 1e6).toFixed(1)}MB)...`)
    try {
      const cmd = `"${ffmpeg}" -i "${inputPath}" -c:v libx264 -preset fast -crf 28 -an -movflags +faststart -vf "scale=-2:480" "${tmpPath}" -y`
      execSync(cmd, { stdio: "pipe", timeout: 180000, shell: true })
      const sizeAfter = statSync(tmpPath).size
      const pct = ((1 - sizeAfter / sizeBefore) * 100).toFixed(1)
      console.log(`  OK: ${(sizeAfter / 1e6).toFixed(1)}MB (${pct}% menos)`)
      unlinkSync(outPath)
      renameSync(tmpPath, outPath)
    } catch (e) {
      console.error(`  Error: ${e.message.slice(0, 100)}`)
      if (existsSync(tmpPath)) unlinkSync(tmpPath)
    }
  }
}
console.log("Compresión completa.")
