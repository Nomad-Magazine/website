# Agent Coding Rules for Nomad Magazine Website

## Priority: SEO and Performance First

This website's primary goal is to rank highly in search engines and attract clients. **All development work must prioritize SEO best practices and performance optimization.**

---

## 1. URL and Link Conventions

### Trailing Slashes (CRITICAL)
- **ALWAYS** end all internal links with a trailing slash (`/`)
- This is a critical convention for proper URL handling and SEO
- Example: `/articles/` ✅ NOT `/articles` ❌
- Apply to all:
  - Internal navigation links
  - Anchor tags (`<a href="/path/">`)
  - Canonical URLs
  - Sitemap entries
  - Image paths that are URLs
  - API endpoints (if applicable)

### URL Structure
- Use clean, descriptive URLs with keywords
- Keep URLs short and readable
- Use hyphens to separate words in URLs
- Avoid underscores and special characters

---

## 2. Image Format Requirements

### WebP Format Mandatory
- **ALL images MUST be in WebP format** (`.webp` extension)
- If you encounter any image that is NOT WebP format:
  - **If AI is capable**: Convert it to WebP automatically
  - **If conversion requires tools**: Report to user that the image needs conversion
- Only exceptions:
  - SVG files (vector graphics)
  - Favicons (if specifically required as PNG/ICO)
- Image paths should reference `.webp` files

### Image Optimization
- Always include `alt` text on ALL images (accessibility + SEO)
- Alt text should be descriptive and include relevant keywords naturally
- Use descriptive filenames for images (include keywords when appropriate)
- Consider image dimensions and file size for performance

---

## 3. SEO Metadata Best Practices

### Title Tags
- **Length**: 50-60 characters (recommended by best practices)
- Include primary keyword near the beginning
- Make it descriptive and compelling
- Unique for every page
- Format: `Primary Keyword - Brand Name` or descriptive variant

### Meta Descriptions
- **Length**: 150-160 characters (recommended by best practices)
- Include primary and secondary keywords naturally
- Write compelling copy that encourages clicks
- Unique for every page
- Should summarize page content accurately

### Keywords
- Include relevant keywords in `keywords` meta tag
- Use natural keyword optimization (not keyword stuffing)
- Focus on semantic keywords related to content
- Include long-tail keywords when appropriate

### Open Graph (OG) Tags
- Always include complete OG tags for social sharing:
  - `og:title`
  - `og:description`
  - `og:image` (must be WebP)
  - `og:url` (with trailing slash)
  - `og:type` (website/article)
  - `og:locale`
  - `og:site_name`
- For articles, include:
  - `article:published_time`
  - `article:modified_time`
  - `article:section`
  - `article:tag` (multiple if applicable)
  - `article:author`

### Twitter Cards
- Include Twitter card meta tags:
  - `twitter:card` (use `summary_large_image` for better engagement)
  - `twitter:title`
  - `twitter:description`
  - `twitter:image` (must be WebP)
  - `twitter:site`
  - `twitter:creator`

### Structured Data (Schema.org JSON-LD)
- Include appropriate structured data on every page
- Use JSON-LD format in `<script type="application/ld+json">`
- **ALWAYS include trailing slashes in all URLs within JSON-LD**
- Common schema types to use:
  - `WebSite` for homepage
  - `BlogPosting` for blog posts
  - `Article` for articles
  - `Organization` for brand/company info
  - `BreadcrumbList` for navigation (when applicable)
  - `Product` for magazine editions (with offers, price, availability)
  - `Event` for events/office hours (with startDate, endDate, location)
  - `JobPosting` for writer/contributor opportunities
  - `DigitalDocument` for flipbooks and digital content
  - `Service` for service offerings
  - `WebApplication` for interactive tools (horoscope, etc.)
- Required properties for all JSON-LD:
  - `@context`: 'https://schema.org'
  - `@type`: appropriate schema type
  - `name`: page/content name
  - `description`: brief description
  - `url`: canonical URL with trailing slash
- Include `publisher` or `provider` with Organization info when applicable

### Twitter Card Meta Tags (CRITICAL)
- **Use `name` attribute, NOT `property`** for Twitter meta tags
- Correct: `<meta name="twitter:card" content="...">`
- Incorrect: `<meta property="twitter:card" content="...">`
- Required tags:
  - `twitter:card` (use `summary_large_image`)
  - `twitter:title`
  - `twitter:description`
  - `twitter:image`
  - `twitter:image:alt` (accessibility)
  - `twitter:site`
  - `twitter:creator`

---

## 4. Content Structure and Headings

### Heading Hierarchy (CRITICAL for SEO)
- Use proper HTML heading structure:
  - **One H1 per page** (main title/keyword-focused)
  - Multiple H2s for major sections
  - H3s for subsections under H2s
  - H4-H6 for deeper nesting if needed
- Never skip heading levels (don't go H1 → H3, use H1 → H2 → H3)
- Include keywords naturally in headings
- Make headings descriptive and user-friendly

### Content Structure
- Use semantic HTML5 elements:
  - `<header>`, `<nav>`, `<main>`, `<article>`, `<section>`, `<aside>`, `<footer>`
- Organize content logically with clear sections
- Use lists (`<ul>`, `<ol>`) appropriately
- Include internal links to related content (with trailing slashes)

---

## 5. Accessibility (WCAG Compliance)

### Images
- **ALWAYS** include `alt` attributes on all images
- Alt text should be descriptive (avoid "image" or "picture")
- Use empty `alt=""` AND `aria-hidden="true"` for decorative images
- Include keywords in alt text when natural and relevant

### SVG Icons and Decorative Elements
- **ALWAYS** add `aria-hidden="true"` to decorative SVGs
- If SVG is inside a button/link with `aria-label`, the SVG should have `aria-hidden="true"`
- Decorative icons that don't convey meaning must be hidden from screen readers
- Example: `<svg aria-hidden="true">...</svg>`

### Links
- Use descriptive link text (avoid "click here", "read more" without context)
- **ALWAYS** add `aria-label` to links that open in new tabs, indicating this behavior
- Example: `aria-label="Learn more about Product (opens in new tab)"`
- Ensure link contrast meets WCAG standards
- **ALWAYS** use `rel="noopener noreferrer"` for ALL external links (security + SEO)

### Buttons and Interactive Elements
- **ALWAYS** add `aria-label` to buttons with only icons (no visible text)
- Add `aria-haspopup="true"` and `aria-expanded="false/true"` to dropdown triggers
- Example: `<button aria-label="Open menu" aria-haspopup="true" aria-expanded="false">`
- Social share buttons need descriptive labels: `aria-label="Share on Twitter"`

### Forms
- **ALWAYS** add `aria-label` to forms: `<form aria-label="Subscribe to newsletter">`
- **ALWAYS** add `aria-label` to inputs without visible labels
- Associate visible labels with form inputs using `for` attribute
- Provide error messages and validation feedback
- Ensure keyboard navigation works

### Keyboard Navigation
- Include a "Skip to main content" link at the top of every page
- Ensure all interactive elements are keyboard accessible
- Use proper focus styling (replace `outline-none` with `focus-visible:ring-2`)
- Main content should be wrapped in `<main id="main-content">`

### Dialogs and Modals
- Add `role="dialog"` to modal containers
- Add `aria-modal="true"` to indicate modal behavior
- Add `aria-labelledby` pointing to the modal's heading
- Trap focus within modal when open

### iframes
- **ALWAYS** add a descriptive `title` attribute to iframes
- Example: `<iframe title="Nomad Magazine Digital Flipbook Viewer" ...>`

### General
- Maintain proper color contrast ratios (4.5:1 for normal text, 3:1 for large text)
- Ensure text is readable (minimum 16px font size recommended)
- Support keyboard navigation throughout the site
- Use semantic HTML elements (`<nav>`, `<main>`, `<article>`, etc.)
- Include ARIA labels when semantic HTML isn't sufficient

---

## 6. Mobile Design and Performance

### Mobile-First Approach
- Design for mobile devices first
- Ensure responsive design works on all screen sizes
- Test on various mobile devices/browsers
- Use responsive images (srcset, sizes attributes)

### Mobile Performance
- Optimize for Core Web Vitals:
  - **Largest Contentful Paint (LCP)**: < 2.5s
  - **First Input Delay (FID)**: < 100ms
  - **Cumulative Layout Shift (CLS)**: < 0.1
- Minimize JavaScript execution time
- Defer non-critical CSS and JavaScript
- Use lazy loading for images below the fold
- Optimize font loading (use font-display: swap)

### Image Optimization for Mobile
- Use appropriate image sizes for different screen densities
- Implement responsive images with `srcset`
- Consider serving smaller images to mobile devices
- All images must be WebP format

### Loading Performance
- Minimize HTTP requests
- Use efficient caching strategies
- Compress assets (gzip/brotli)
- Minimize CSS and JavaScript file sizes
- Consider code splitting for large applications

---

## 7. Technical SEO

### Canonical URLs
- Include canonical URL on every page
- Use trailing slash in canonical URLs
- Point to preferred version of duplicate content

### Robots Meta
- Use `index, follow` for pages that should be indexed
- Use `noindex, nofollow` for pages that shouldn't be indexed
- Ensure robots.txt is properly configured

### Sitemap
- Ensure sitemap includes all important pages
- Use trailing slashes in sitemap URLs
- Keep sitemap updated

### URL Structure
- Use HTTPS everywhere
- Implement proper redirects (301 for permanent, 302 for temporary)
- Avoid broken links (404 errors)
- Use clean, descriptive URLs

---

## 8. Content Optimization

### Keyword Optimization
- Include primary keywords naturally in content
- Use semantic keywords and related terms
- Include long-tail keywords where relevant
- Optimize for user intent, not just keywords

### Internal Linking
- Link to related content within the site
- Use descriptive anchor text
- Ensure all internal links use trailing slashes
- Create logical site structure through internal linking

### External Linking
- Link to authoritative, relevant sources
- Use `rel="noopener noreferrer"` for external links
- Consider nofollow for paid/sponsored links if applicable

---

## 9. Page Speed Optimization

### Asset Optimization
- Minimize CSS and JavaScript
- Use efficient image formats (WebP)
- Optimize font loading
- Use CDN when applicable
- Enable compression (gzip/brotli)

### Code Optimization
- Minify HTML, CSS, and JavaScript for production
- Remove unused code and dependencies
- Use efficient algorithms and data structures
- Optimize database queries (if applicable)

### Caching
- Implement proper caching headers
- Use browser caching for static assets
- Consider service workers for offline functionality (if applicable)

---

## 10. CLI SEO Validation (MANDATORY)

### Build and SEO Check Requirement
- **The SEO rules are enforced by a CLI tool that runs in CI/CD**
- **CI/CD will REJECT deployments that fail SEO validation**
- Every time you create or modify an article/page, you MUST:
  1. Run the build command to ensure no build errors
  2. Run the SEO check to validate compliance

### Required Commands
```bash
# 1. Run the build first
bun run build

# 2. Run SEO validation
bun run seo:check
```

### When to Run These Checks
- After creating a new article
- After modifying existing content
- After changing metadata (title, description, etc.)
- After adding/modifying images
- Before committing any content changes

### What the SEO Check Validates
- Title tag length (50-60 characters)
- Meta description length (150-160 characters)
- Image formats (WebP only)
- Alt text presence on images
- Trailing slashes on URLs
- Proper heading hierarchy
- JSON-LD structured data
- Open Graph and Twitter card tags

**DO NOT commit content changes without running these checks. The CI/CD pipeline will reject non-compliant content.**

---

## 11. Quality Assurance Checklist

Before considering any work complete, verify:

### URLs and Links
- [ ] All internal links end with trailing slash
- [ ] All external links have `rel="noopener noreferrer"`
- [ ] No broken links (404 errors)

### Images
- [ ] All images are in WebP format (except SVGs/favicons)
- [ ] All images have descriptive alt text
- [ ] Decorative images have `alt=""` and `aria-hidden="true"`

### SEO Meta Tags
- [ ] Title tag is 50-60 characters with primary keyword
- [ ] Meta description is 150-160 characters with keywords
- [ ] Complete Open Graph tags included
- [ ] Twitter card meta tags use `name` attribute (not `property`)
- [ ] Canonical URL included with trailing slash
- [ ] Keywords included naturally in content

### JSON-LD Structured Data
- [ ] Appropriate schema type used for page content
- [ ] All URLs in JSON-LD include trailing slashes
- [ ] Required properties included (@context, @type, name, description, url)
- [ ] Publisher/Organization info included where applicable

### Content Structure
- [ ] Proper heading hierarchy (one H1, then H2 → H3)
- [ ] Semantic HTML elements used (`<main>`, `<article>`, `<section>`, etc.)

### Accessibility (CRITICAL)
- [ ] All decorative SVGs have `aria-hidden="true"`
- [ ] All icon-only buttons have `aria-label`
- [ ] Dropdown buttons have `aria-haspopup` and `aria-expanded`
- [ ] Forms have `aria-label` on form element
- [ ] Inputs without visible labels have `aria-label`
- [ ] External links indicate "opens in new tab" in `aria-label`
- [ ] iframes have descriptive `title` attribute
- [ ] Skip-to-content link present
- [ ] Focus styling uses `focus-visible:ring` (not `outline-none`)

### Performance
- [ ] Mobile responsive design works correctly
- [ ] Page loads quickly (test with PageSpeed Insights)
- [ ] Images use `loading="lazy"` for below-fold content

---

## Summary

**Remember**: This website's success depends on SEO ranking and performance. Every change should be evaluated through this lens. When in doubt, prioritize SEO best practices, performance optimization, accessibility, and mobile experience.

