const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const PUBLIC_VIDEOS = path.join(__dirname, "..", "public", "videos");
const OUTPUT_DIR = path.join(__dirname, "..", "temp-compressed");
const CLOUDINARY_CLOUD = "dxgqv585u";

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

function probe(file) {
  const cmd = `ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,bit_rate -show_entries format=duration,size,bit_rate -of json "${file}"`;
  return JSON.parse(execSync(cmd, { encoding: "utf-8" }));
}

function compressHero(input, output, targetWidth) {
  const cmd = `ffmpeg -y -i "${input}" -c:v libx264 -preset slow -crf 25 -vf scale=${targetWidth}:-2:flags=lanczos -an -movflags +faststart -pix_fmt yuv420p "${output}"`;
  console.log(`  Encoding: 4K → ${targetWidth}p`);
  execSync(cmd, { stdio: "inherit" });
}

function compressPlan(input, output) {
  const cmd = `ffmpeg -y -i "${input}" -c:v libx264 -preset slow -crf 28 -vf scale=1280:-2:flags=lanczos -an -movflags +faststart -pix_fmt yuv420p "${output}"`;
  console.log(`  Encoding: 480p → 720p`);
  execSync(cmd, { stdio: "inherit" });
}

// Compress hero videos
console.log("=== COMPRESSING HERO VIDEOS (4K → 1080p) ===");
const heroFiles = fs.readdirSync(PUBLIC_VIDEOS).filter((f) => f.match(/^video\d+\.mp4$/));
for (const file of heroFiles) {
  const input = path.join(PUBLIC_VIDEOS, file);
  const output = path.join(OUTPUT_DIR, file);
  const info = probe(input);
  const stream = info.streams.find((s) => s.codec_type === "video" || s.codec_name === "h264");
  const fmt = info.format;
  const origMB = (fmt.size / 1024 / 1024).toFixed(1);
  console.log(`\n${file}: ${stream.width}x${stream.height}, ${origMB}MB`);

  compressHero(input, output, 1920);

  const outInfo = probe(output);
  const outMB = (outInfo.format.size / 1024 / 1024).toFixed(1);
  const savings = ((1 - outInfo.format.size / fmt.size) * 100).toFixed(0);
  console.log(`  Result: ${outMB}MB (saved ${savings}%)`);
}

// Compress plan videos from temp-videos/
console.log("\n=== COMPRESSING PLAN VIDEOS (480p → 720p, better encoding) ===");
const TEMP_VIDEOS = path.join(__dirname, "..", "temp-videos");
if (fs.existsSync(TEMP_VIDEOS)) {
  const planFiles = fs.readdirSync(TEMP_VIDEOS).filter((f) => f.endsWith(".mp4"));
  for (const file of planFiles) {
    const input = path.join(TEMP_VIDEOS, file);
    const output = path.join(OUTPUT_DIR, file);
    const info = probe(input);
    const fmt = info.format;
    const origKB = (fmt.size / 1024).toFixed(0);
    console.log(`\n${file}: ${origKB}KB`);

    compressPlan(input, output);

    const outInfo = probe(output);
    const outKB = (outInfo.format.size / 1024).toFixed(0);
    console.log(`  Result: ${outKB}KB`);
  }
}

console.log("\n=== DONE ===");
console.log("Output: " + OUTPUT_DIR);
