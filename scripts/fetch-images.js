#!/usr/bin/env node

import fs from 'fs/promises'
import { createWriteStream, unlink } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import https from 'https'
import { glob } from 'glob'
import crypto from 'crypto'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configuration
const SRC_DIR = path.join(__dirname, '../src')
const PUBLIC_DIR = path.join(__dirname, '../public')
const IMAGES_DIR = path.join(PUBLIC_DIR, 'images')

// Track processed URLs to avoid duplicates
const processedUrls = new Map()

/**
 * Download a file from URL to local path
 */
async function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(filepath)

    https
      .get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download ${url}: ${response.statusCode}`))
          return
        }

        response.pipe(file)

        file.on('finish', () => {
          file.close()
          resolve()
        })

        file.on('error', (err) => {
          unlink(filepath).catch(() => {}) // Delete the file if it exists
          reject(err)
        })
      })
      .on('error', reject)
  })
}

/**
 * Extract file extension from URL
 */
function getFileExtension(url) {
  try {
    const urlObj = new URL(url)
    const pathname = urlObj.pathname
    const filename = path.basename(pathname)
    const ext = path.extname(filename)

    // If no extension found, default to .jpg
    if (!ext) {
      return '.jpg'
    }

    return ext
  } catch (error) {
    console.error(`Error parsing URL ${url}:`, error.message)
    return '.jpg'
  }
}

/**
 * Generate a random filename using crypto UUID
 */
function generateRandomFilename(url) {
  const ext = getFileExtension(url)
  const uuid = crypto.randomUUID()
  return `${uuid}${ext}`
}

/**
 * Find all HTTPS image URLs in a file
 */
function findImageUrls(content) {
  const imageUrlRegex = /https:\/\/[^\s"')]+\.(jpg|jpeg|png|gif|webp|svg|avif|ico)(\?[^\s"')]*)?/gi
  const matches = content.match(imageUrlRegex) || []
  return [...new Set(matches)] // Remove duplicates
}

/**
 * Replace HTTPS URLs with local paths
 */
function replaceImageUrls(content, urlMap) {
  let updatedContent = content

  for (const [url, localPath] of urlMap) {
    const escapedUrl = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(escapedUrl, 'g')
    updatedContent = updatedContent.replace(regex, localPath)
  }

  return updatedContent
}

/**
 * Process a single file
 */
async function processFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    const imageUrls = findImageUrls(content)

    if (imageUrls.length === 0) {
      return
    }

    console.log(`\nProcessing ${filePath}:`)
    console.log(`Found ${imageUrls.length} image URL(s)`)

    const urlMap = new Map()

    for (const url of imageUrls) {
      if (processedUrls.has(url)) {
        // Use already processed URL
        urlMap.set(url, processedUrls.get(url))
        console.log(`  ✓ Already processed: ${url}`)
        continue
      }

      try {
        const randomFilename = generateRandomFilename(url)
        const localPath = path.join(IMAGES_DIR, randomFilename)
        const publicPath = `/images/${randomFilename}`

        // Download the image
        console.log(`  ↓ Downloading: ${url}`)
        await downloadFile(url, localPath)

        // Store the mapping
        urlMap.set(url, publicPath)
        processedUrls.set(url, publicPath)

        console.log(`  ✓ Downloaded: ${publicPath}`)
      } catch (error) {
        console.error(`  ✗ Failed to download ${url}:`, error.message)
      }
    }

    // Update the file content
    if (urlMap.size > 0) {
      const updatedContent = replaceImageUrls(content, urlMap)
      await fs.writeFile(filePath, updatedContent, 'utf-8')
      console.log(`  ✓ Updated file with local image paths`)
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message)
  }
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('🚀 Starting image fetch and localize script...\n')

    // Create images directory if it doesn't exist
    await fs.mkdir(IMAGES_DIR, { recursive: true })
    console.log(`📁 Created images directory: ${IMAGES_DIR}`)

    // Find all Astro files
    const astroFiles = await glob('**/*.astro', {
      cwd: SRC_DIR,
      absolute: true,
    })

    console.log(`📄 Found ${astroFiles.length} Astro file(s) to process`)

    // Process each file
    for (const file of astroFiles) {
      await processFile(file)
    }

    console.log('\n✅ Script completed successfully!')
    console.log(`📊 Processed ${processedUrls.size} unique image URL(s)`)
    console.log(`📁 Images saved to: ${IMAGES_DIR}`)
  } catch (error) {
    console.error('❌ Script failed:', error.message)
    process.exit(1)
  }
}

// Run the script
main()
