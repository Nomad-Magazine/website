const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const files = [
  'nomad-cafe-isolation-collage.png',
  'nomad-tools-collage.png',
  'nomad-connection-collage.png'
];

const srcDir = '/Users/pityakova/.cursor/projects/Users-pityakova-Documents-NGM-Website/assets/';
const destDir = '/Users/pityakova/Documents/NGM/Website/public/images/';

async function convert() {
  for (const file of files) {
    const srcPath = path.join(srcDir, file);
    const destPath = path.join(destDir, file.replace('.png', '.webp'));
    
    if (fs.existsSync(srcPath)) {
      await sharp(srcPath)
        .webp({ quality: 80 })
        .toFile(destPath);
      console.log(`Converted ${file} to WebP`);
    } else {
      console.log(`File not found: ${srcPath}`);
    }
  }
}

convert().catch(console.error);
