const sharp = require('sharp');
const fs = require('fs');

const srcPath = '/Users/pityakova/.cursor/projects/Users-pityakova-Documents-NGM-Website/assets/CleanShot_2026-03-12_at_14.42.10-ccd9590c-02ad-4829-ab7f-fb210b89c305.png';
const destPath = '/Users/pityakova/Documents/NGM/Website/public/images/nomad-connection-best-collage.webp';

async function convert() {
  if (fs.existsSync(srcPath)) {
    await sharp(srcPath)
      .webp({ quality: 80 })
      .toFile(destPath);
    console.log('Converted best image to WebP');
  } else {
    console.log('Best image not found');
  }
}

convert().catch(console.error);
