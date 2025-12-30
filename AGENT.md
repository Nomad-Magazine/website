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
- Common types:
  - `WebSite` for homepage
  - `BlogPosting` for blog posts
  - `Article` for articles
  - `Organization` for brand/company info
  - `BreadcrumbList` for navigation (when applicable)

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
- Use empty `alt=""` only for decorative images that don't convey meaning
- Include keywords in alt text when natural and relevant

### Links
- Use descriptive link text (avoid "click here", "read more" without context)
- Indicate external links clearly
- Ensure link contrast meets WCAG standards
- Use `rel="noopener noreferrer"` for external links

### Forms
- Associate labels with form inputs
- Provide error messages and validation feedback
- Ensure keyboard navigation works

### General
- Maintain proper color contrast ratios
- Ensure text is readable (minimum font sizes)
- Support keyboard navigation
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

## 10. Quality Assurance Checklist

Before considering any work complete, verify:

- [ ] All internal links end with trailing slash
- [ ] All images are in WebP format (except SVGs/favicons)
- [ ] All images have descriptive alt text
- [ ] Title tag is 50-60 characters with primary keyword
- [ ] Meta description is 150-160 characters with keywords
- [ ] Proper heading hierarchy (H1 → H2 → H3)
- [ ] Complete Open Graph tags included
- [ ] Twitter card meta tags included
- [ ] Structured data (JSON-LD) included where applicable
- [ ] Canonical URL included with trailing slash
- [ ] Mobile responsive design works correctly
- [ ] Page loads quickly (test with PageSpeed Insights)
- [ ] Accessibility standards met (alt text, semantic HTML, etc.)
- [ ] No broken links
- [ ] Keywords included naturally in content

---

## Summary

**Remember**: This website's success depends on SEO ranking and performance. Every change should be evaluated through this lens. When in doubt, prioritize SEO best practices, performance optimization, accessibility, and mobile experience.

