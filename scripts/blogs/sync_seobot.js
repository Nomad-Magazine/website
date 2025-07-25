import '@dotenvx/dotenvx/config'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { BlogClient } from 'seobot'

const BLOG_DIR = 'src/content/blog/'
const PAGE_SIZE = 10

const iframe = `<iframe src="$1" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" style="width: 100%; height: 500px;" allowfullscreen></iframe>`
const iframeRegex = /:::\s*@iframe\s+(.*?)\s*:::/g
const faqRegex = /::: faq\s*([\s\S]*?)\s*:::/g

const keyToReplace = {}

const replaceFrontmatter = (text) => {
  if (!text) return ''
  // First clean the text
  const cleaned = text
    .replace(/\r/g, '') // Remove carriage returns
    .replace(/\t/g, ' ') // Replace tabs with spaces
    .replace(/[^\x20-\x7E]/g, '') // Remove non-printable characters
    .trim() // Remove leading/trailing whitespace

  // If text contains any special characters, wrap it in double quotes and escape properly
  if (/[:'"`\n]/.test(cleaned)) {
    return `"${
      cleaned
        .replace(/"/g, '\\"') // Escape double quotes
        .replace(/\n/g, '\\n') // Escape newlines
    }"`
  }

  return cleaned
}

// Helper function to replace all keys in keyToReplace with their values in a string
function replaceKeysInContent(content, keyMap) {
  let result = content
  for (const [key, value] of Object.entries(keyMap)) {
    // Use global replacement for all occurrences
    result = result.split(key).join(value)
  }
  return result
}

async function main() {
  if (!process.env.SEOBOT_API_KEY) throw new Error('SEOBOT_API_KEY environment variable is required')
  const client = new BlogClient(process.env.SEOBOT_API_KEY)
  if (!existsSync(BLOG_DIR)) mkdirSync(BLOG_DIR, { recursive: true })
  let page = 0
  let hasMore = true
  while (hasMore) {
    try {
      const response = await client.getArticles(page, PAGE_SIZE)
      console.log(`Fetched ${response.articles.length} articles on page ${page}, total: ${response.total}`)
      if (!response.articles || response.articles.length === 0) {
        hasMore = false
        continue
      }
      for (const article of response.articles) {
        const fileName = `${article.slug}.md`
        const filePath = join(BLOG_DIR, fileName)
        const articleResponse = await client.getArticle(article.slug)
        console.log(`Fetched article ${article.slug}`)
        // Create frontmatter
        const frontmatter = [
          '---',
          `slug: ${article.slug}`,
          `title: ${replaceFrontmatter(article.headline)}`,
          `description: ${replaceFrontmatter(article.metaDescription)}`,
          'author: Martin Donadieu',
          'author_image_url: https://avatars.githubusercontent.com/u/4084527?v=4',
          'author_url: https://github.com/riderx',
          `created_at: ${article.createdAt}`,
          `updated_at: ${article.updatedAt}`,
          `head_image: ${article.image}`,
          `head_image_alt: ${replaceFrontmatter(article.category.title)}`,
          `keywords: ${replaceFrontmatter(articleResponse.metaKeywords)}`,
          `tag: ${replaceFrontmatter(article.tags.map((tag) => tag.title).join(', '))}`,
          'published: true',
          'locale: en',
          "next_blog: ''",
          '---',
          '',
        ].join('\n')
        const cleanMarkdown = articleResponse.markdown.replace(
          `# ${article.headline}
`,
          '',
        )
        const transformedMarkdown = cleanMarkdown.replace(iframeRegex, iframe).replace(faqRegex, (_, content) => content.trim())
        // Combine frontmatter with markdown content
        let content = `${frontmatter}${transformedMarkdown}`
        // Replace all keys in keyToReplace with their values in the content
        content = replaceKeysInContent(content, keyToReplace)
        writeFileSync(filePath, content)
      }
      page++
    } catch (error) {
      console.error(`Error fetching articles for page ${page}:`, error)
      hasMore = false
    }
  }
}

main()
