import { readFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const manifestPath = 'src/utils/directory-screenshots.json'
const outDir = process.argv[2] || 'pr-assets/pr-screenshots'
const sampleCount = Number(process.argv[3] || 12)
const cols = 4
const cellW = 400
const cellH = 250

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
const ids = Object.keys(manifest).slice(0, sampleCount)
if (!ids.length) throw new Error('No screenshots in manifest')

const tiles = []
for (const id of ids) {
  const file = manifest[id].file.replace(/^\//, 'public/')
  const img = await sharp(file).resize(cellW, cellH, { fit: 'cover' }).toBuffer()
  tiles.push(img)
}

const rows = Math.ceil(tiles.length / cols)
const canvas = sharp({
  create: {
    width: cols * cellW,
    height: rows * cellH,
    channels: 3,
    background: '#111827',
  },
})

const composites = tiles.map((input, index) => ({
  input,
  left: (index % cols) * cellW,
  top: Math.floor(index / cols) * cellH,
}))

await mkdir(outDir, { recursive: true })
const webpOut = path.join(outDir, 'contact-sheet.webp')
const pngOut = path.join(outDir, 'contact-sheet.png')
await canvas.composite(composites).webp({ quality: 82 }).toFile(webpOut)
await sharp(webpOut).png().toFile(pngOut)
console.log(`Wrote ${webpOut} and ${pngOut} (${ids.length} samples)`)