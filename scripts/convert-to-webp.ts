import { chromium } from 'playwright'
import { readFileSync, writeFileSync } from 'fs'

const pngPath = '/opt/cursor/artifacts/badges-light-v4.png'
const webpPath = 'docs/screenshots/awards-badges.webp'

async function convertToWebP() {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  
  const pngBuffer = readFileSync(pngPath)
  const base64 = pngBuffer.toString('base64')
  
  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <head></head>
    <body>
      <canvas id="canvas"></canvas>
      <script>
        const img = new Image();
        img.onload = () => {
          const canvas = document.getElementById('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          window.webpData = canvas.toDataURL('image/webp', 0.9);
        };
        img.src = 'data:image/png;base64,${base64}';
      </script>
    </body>
    </html>
  `)
  
  await page.waitForFunction(() => (window as Window & { webpData?: string }).webpData !== undefined)
  const webpDataUrl = await page.evaluate(() => (window as Window & { webpData?: string }).webpData ?? '')
  
  const webpBase64 = webpDataUrl.split(',')[1]
  const webpBuffer = Buffer.from(webpBase64, 'base64')
  
  writeFileSync(webpPath, webpBuffer)
  
  await browser.close()
  console.log(`Converted ${pngPath} to ${webpPath}`)
}

convertToWebP().catch(console.error)
