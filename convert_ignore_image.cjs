const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const srcPath = '/Users/pityakova/.cursor/projects/Users-pityakova-Documents-NGM-Website/assets/nomad-cafe-ignore-collage.png';
const destPath = '/Users/pityakova/Documents/NGM/Website/public/images/nomad-cafe-ignore-collage.webp';

async function convert() {
  if (fs.existsSync(srcPath)) {
    await sharp(srcPath)
      .webp({ quality: 80 })
      .toFile(destPath);
    console.log('Converted ignore image to WebP');
  } else {
    console.log('Ignore image not found');
  }
}

convert().catch(console.error);
