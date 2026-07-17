const cloudinary = require("cloudinary").v2;
const path = require("path");
const fs = require("fs");

cloudinary.config({
  cloud_name: "dxgqv585u",
  api_key: "265476144412559",
  api_secret: "GTRlPcvYK_OyL65vNevH-LC8UDI",
});

const COMPRESSED = path.join(__dirname, "..", "temp-compressed");

async function uploadFile(filename, publicId) {
  const filePath = path.join(COMPRESSED, filename);
  if (!fs.existsSync(filePath)) {
    console.log(`  SKIP: ${filename} not found`);
    return null;
  }
  const sizeMB = (fs.statSync(filePath).size / 1024 / 1024).toFixed(2);
  console.log(`  Uploading ${filename} (${sizeMB}MB) → ${publicId}...`);
  const result = await cloudinary.uploader.upload(filePath, {
    resource_type: "video",
    public_id: publicId,
    overwrite: true,
    format: "mp4",
  });
  console.log(`  OK: ${result.secure_url}`);
  return result.secure_url;
}

async function main() {
  console.log("=== UPLOADING HERO VIDEOS ===\n");
  const heroUrls = {};
  for (let i = 1; i <= 8; i++) {
    if (i === 7) continue;
    const url = await uploadFile(`video${i}.mp4`, `panitas/videos/hero/video${i}`);
    heroUrls[`video${i}`] = url;
  }

  console.log("\n=== UPLOADING PLAN VIDEOS ===\n");
  const planMap = {
    "agenda_agenda1.mp4": "panitas/videos/plans/agenda/agenda1",
    "agenda_agenda2.mp4": "panitas/videos/plans/agenda/agenda2",
    "agenda_agenda3.mp4": "panitas/videos/plans/agenda/agenda3",
    "emprendedor_emprendedor1.mp4": "panitas/videos/plans/emprendedor/emprendedor1",
    "emprendedor_emprendedor2.mp4": "panitas/videos/plans/emprendedor/emprendedor2",
    "emprendedor_emprendedor3.mp4": "panitas/videos/plans/emprendedor/emprendedor3",
    "mayorista_mayorista1.mp4": "panitas/videos/plans/mayorista/mayorista1",
    "mayorista_mayorista2.mp4": "panitas/videos/plans/mayorista/mayorista2",
    "mayorista_mayorista3.mp4": "panitas/videos/plans/mayorista/mayorista3",
  };
  const planUrls = {};
  for (const [file, pid] of Object.entries(planMap)) {
    const url = await uploadFile(file, pid);
    planUrls[pid.split("/").pop()] = url;
  }

  console.log("\n=== RESULTS ===");
  console.log("\nHero URLs:");
  console.log(JSON.stringify(heroUrls, null, 2));
  console.log("\nPlan URLs:");
  console.log(JSON.stringify(planUrls, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
