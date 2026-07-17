const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const publicDir = path.join(__dirname, '..', 'public');

async function optimize() {
  const src = path.join(publicDir, 'faviconnew.jpeg');
  if (!fs.existsSync(src)) {
    console.log('faviconnew.jpeg not found, skipping');
    return;
  }

  const meta = await sharp(src).metadata();
  console.log(`Source: ${meta.width}x${meta.height}, ${(fs.statSync(src).size / 1024).toFixed(0)}KB`);

  // favicon.ico 32x32
  await sharp(src).resize(32, 32).png().toFile(path.join(publicDir, 'favicon.png'));
  console.log('favicon.png 32x32 done');

  // apple-touch-icon 180x180
  await sharp(src).resize(180, 180).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('apple-touch-icon.png 180x180 done');

  // og-image 1200x630
  await sharp(src).resize(1200, 630, { fit: 'cover' }).jpeg({ quality: 80 }).toFile(path.join(publicDir, 'og-image.jpg'));
  console.log('og-image.jpg 1200x630 done');

  // Remove old large faviconnew.jpeg
  const srcSize = (fs.statSync(src).size / 1024 / 1024).toFixed(1);
  fs.unlinkSync(src);
  console.log('Removed faviconnew.jpeg (was ' + srcSize + 'MB)');

  // Check logonuevo.png and logo.png sizes
  for (const f of ['logonuevo.png', 'logo.png']) {
    const fp = path.join(publicDir, f);
    if (fs.existsSync(fp)) {
      const sz = fs.statSync(fp).size;
      console.log(`${f}: ${(sz / 1024).toFixed(0)}KB`);
    }
  }
}

optimize().catch(e => { console.error(e); process.exit(1); });
