const sharp = require("sharp")
const path = require("path")

const ROOT = path.join(__dirname, "..")
const SIZE = 96
const RADIUS = 18

const svg = `<svg width="${SIZE}" height="${SIZE}">
  <rect width="${SIZE}" height="${SIZE}" rx="${RADIUS}" ry="${RADIUS}" fill="white"/>
</svg>`

sharp(path.join(ROOT, "logo.jpeg"))
  .resize(SIZE, SIZE, { fit: "cover" })
  .composite([{ input: Buffer.from(svg), blend: "dest-in" }])
  .png()
  .toFile(path.join(ROOT, "public", "favicon.png"))
  .then(() => console.log("Done"))
  .catch((e) => console.error(e))
