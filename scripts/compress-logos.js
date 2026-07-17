const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const publicDir = path.join(__dirname, '..', 'public');

async function compress() {
  // logonuevo.png -> compressed PNG
  const ln = path.join(publicDir, 'logonuevo.png');
  if (fs.existsSync(ln)) {
    const before = fs.statSync(ln).size;
    const meta = await sharp(ln).metadata();
    console.log(`logonuevo.png: ${meta.width}x${meta.height}, ${(before/1024).toFixed(0)}KB`);
    
    // Recompress as optimized PNG
    await sharp(ln).png({ compressionLevel: 9, quality: 80 }).toFile(path.join(publicDir, 'logonuevo-tmp.png'));
    fs.renameSync(path.join(publicDir, 'logonuevo-tmp.png'), ln);
    const after = fs.statSync(ln).size;
    console.log(`  -> ${(after/1024).toFixed(0)}KB (saved ${((before-after)/1024).toFixed(0)}KB)`);
  }

  // logo.png -> compressed PNG
  const lg = path.join(publicDir, 'logo.png');
  if (fs.existsSync(lg)) {
    const before = fs.statSync(lg).size;
    const meta = await sharp(lg).metadata();
    console.log(`logo.png: ${meta.width}x${meta.height}, ${(before/1024).toFixed(0)}KB`);
    
    await sharp(lg).png({ compressionLevel: 9, quality: 80 }).toFile(path.join(publicDir, 'logo-tmp.png'));
    fs.renameSync(path.join(publicDir, 'logo-tmp.png'), lg);
    const after = fs.statSync(lg).size;
    console.log(`  -> ${(after/1024).toFixed(0)}KB (saved ${((before-after)/1024).toFixed(0)}KB)`);
  }
}

compress().catch(e => { console.error(e); process.exit(1); });
