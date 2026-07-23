const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "..", "temp-sources");
const DST = path.join(__dirname, "..", "temp-vp9");

function probe(file) {
  const cmd = `ffprobe -v error -show_entries format=size -of csv=p=0 "${file}"`;
  return parseInt(execSync(cmd, { encoding: "utf-8" }).trim());
}

function convert(input, output, crf) {
  const args = ["-y", "-i", input, "-c:v", "libvpx-vp9", "-crf", String(crf), "-b:v", "0", "-deadline", "good", "-cpu-used", "4", "-pix_fmt", "yuv420p", "-an", output];
  const { spawnSync } = require("child_process");
  const result = spawnSync("ffmpeg", args, { stdio: "inherit" });
  if (result.status !== 0) throw new Error(`ffmpeg failed for ${input}`);
}

const files = fs.readdirSync(SRC).filter(f => f.endsWith(".mp4"));

console.log("=== VP9/WEBM CONVERSION ===\n");

let totalOriginal = 0;
let totalVP9 = 0;

for (const file of files) {
  const input = path.join(SRC, file);
  const outputName = file.replace(".mp4", ".webm");
  const output = path.join(DST, outputName);

  const origBytes = probe(input);
  const origKB = (origBytes / 1024).toFixed(0);
  console.log(`${file}: ${origKB}KB → encoding VP9...`);

  convert(input, output, 30);

  const vp9Bytes = fs.statSync(output).size;
  const vp9KB = (vp9Bytes / 1024).toFixed(0);
  const savings = ((1 - vp9Bytes / origBytes) * 100).toFixed(0);
  console.log(`  → ${vp9KB}KB (saved ${savings}%)\n`);

  totalOriginal += origBytes;
  totalVP9 += vp9Bytes;
}

console.log("=== TOTALS ===");
console.log(`H.264: ${(totalOriginal / 1024 / 1024).toFixed(1)}MB`);
console.log(`VP9:   ${(totalVP9 / 1024 / 1024).toFixed(1)}MB`);
console.log(`Saved: ${((1 - totalVP9 / totalOriginal) * 100).toFixed(0)}%`);
