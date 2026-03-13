const sharp = require('sharp');
const fs = require('fs');

const srcPath = '/Users/pityakova/.cursor/projects/Users-pityakova-Documents-NGM-Website/assets/nomad-hero-photorealistic-collage.png';
const destPath = '/Users/pityakova/Documents/NGM/Website/public/images/nomad-hero-photorealistic-collage.webp';

async function convert() {
  if (fs.existsSync(srcPath)) {
    await sharp(srcPath)
      .webp({ quality: 80 })
      .toFile(destPath);
    console.log('Converted hero image to WebP');
  } else {
    console.log('Hero image not found');
  }
}

convert().catch(console.error);
