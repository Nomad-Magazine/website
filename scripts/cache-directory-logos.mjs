import { readFile, mkdir, access, writeFile, readdir } from 'node:fs/promises'
import sharp from 'sharp'

const { records } = JSON.parse(await readFile('src/utils/nomad_cache_table_6857167d82358a0f5e038c3f.json', 'utf8'))
await mkdir('public/images/directory-logos', { recursive: true })
const pending = records.filter((record) => record.sf4ad525dd && record.image?.startsWith('https://'))
let failures = 0
await Promise.all(
  Array.from({ length: 8 }, async () => {
    for (let record; (record = pending.pop()); ) {
      const destination = `public/images/directory-logos/${record.id}.webp`
      try {
        if (!process.argv.includes('--refresh')) {
          await access(destination)
          continue
        }
      } catch {}
      try {
        const response = await fetch(record.image, { signal: AbortSignal.timeout(15000) })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const bytes = await response.arrayBuffer()
        const image = await sharp(Buffer.from(bytes)).resize(112, 112, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toBuffer()
        await writeFile(destination, image)
      } catch {
        failures++
        console.warn(`Logo unavailable: ${record.title}; use text initial.`)
      }
    }
  }),
)
console.log(`Logo sync finished; ${failures} unavailable.`)

const files = (await readdir('public/images/directory-logos')).filter((name) => name.endsWith('.webp')).sort()
await writeFile('src/utils/directory-logo-files.json', JSON.stringify(files, null, 2) + '\n')
