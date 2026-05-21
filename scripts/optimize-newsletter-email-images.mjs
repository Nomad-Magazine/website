#!/usr/bin/env bun
/**
 * Resize newsletter images for email (display size × 2 for retina).
 * Output: public/images/email/newsletter-may-2026/
 *
 * Usage: bun scripts/optimize-newsletter-email-images.mjs
 */
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { $ } from 'bun'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = join(root, 'public/images')
const outDir = join(root, 'public/images/email/newsletter-may-2026')

mkdirSync(outDir, { recursive: true })

const covers = [
  ['edition-004-cover.webp', 'edition-004-cover.webp'],
  ['third-edition-cover-hd.webp', 'third-edition-cover.webp'],
  ['edition-002-cover.webp', 'edition-002-cover.webp'],
  ['first-edition-cover-hd.webp', 'first-edition-cover.webp'],
]

const articles = [
  'azores-dwell-coliving-terrace-sunset.webp',
  'beyond-travel-nomad-chapter-hero-komodo.webp',
  'south-africa-nomads-status-quo.webp',
  'saipan-remote-work-sunset-microbeach.webp',
]

for (const [source, dest] of covers) {
  await $`bunx sharp-cli resize 168 224 --fit cover --withoutEnlargement -i ${join(srcDir, source)} -o ${join(outDir, dest)} -f webp -q 72`
}

for (const name of articles) {
  await $`bunx sharp-cli resize 440 440 --fit cover --withoutEnlargement -i ${join(srcDir, name)} -o ${join(outDir, name)} -f webp -q 72`
}

console.log(`Done. Optimized images in ${outDir}`)
