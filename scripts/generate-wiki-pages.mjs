/**
 * Splits digital-nomad-wiki.astro into separate chapter pages.
 * Run: node scripts/generate-wiki-pages.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const src = readFileSync(join(ROOT, 'src/pages/digital-nomad-wiki.astro'), 'utf8');
const lines = src.split('\n');

const outDir = join(ROOT, 'src/pages/digital-nomad-wiki');
mkdirSync(outDir, { recursive: true });

// ─── Chapter metadata ────────────────────────────────────────────────────────
const chapters = [
  { num: 1,  slug: 'chapter-1',  title: 'What Is the Digital Nomad Lifestyle?',        desc: 'The Lifestyle',    startComment: '<!-- Chapter 1: What Is', endComment: '<!-- Read Next: after Chapter 1' },
  { num: 2,  slug: 'chapter-2',  title: 'A Brief History of Digital Nomadism',          desc: 'Origins',          startComment: '<!-- Chapter 2: A Brief History', endComment: '<!-- Chapter 3: Who Are' },
  { num: 3,  slug: 'chapter-3',  title: 'Who Are the Digital Nomads?',                  desc: 'The People',       startComment: '<!-- Chapter 3: Who Are', endComment: '<!-- Chapter 4: The Infrastructure' },
  { num: 4,  slug: 'chapter-4',  title: 'The Infrastructure of a Lifestyle',            desc: 'The Tools',        startComment: '<!-- Chapter 4: The Infrastructure', endComment: '<!-- Chapter 5: Where Do' },
  { num: 5,  slug: 'chapter-5',  title: 'Where Do They Go?',                            desc: 'Destinations',     startComment: '<!-- Chapter 5: Where Do', endComment: '<!-- Read Next: after Chapter 5' },
  { num: 6,  slug: 'chapter-6',  title: 'Legal Life and Visas',                         desc: 'Visas & Law',      startComment: '<!-- Chapter 6: Legal Life', endComment: '<!-- Read Next: after Chapter 6' },
  { num: 7,  slug: 'chapter-7',  title: 'Money Matters',                                desc: 'Finances',         startComment: '<!-- Chapter 7: Money Matters', endComment: '<!-- Read Next: after Chapter 7' },
  { num: 8,  slug: 'chapter-8',  title: 'Life on the Move',                             desc: 'Daily Life',       startComment: '<!-- Chapter 8: Life on', endComment: '<!-- Chapter 9: The Ecosystem' },
  { num: 9,  slug: 'chapter-9',  title: 'The Ecosystem of Digital Nomad Services',      desc: 'Services',         startComment: '<!-- Chapter 9: The Ecosystem', endComment: '<!-- Chapter 10: Criticism' },
  { num: 10, slug: 'chapter-10', title: 'Criticism and Controversies',                  desc: 'Controversies',    startComment: '<!-- Chapter 10: Criticism', endComment: '<!-- Chapter 11: The Future' },
  { num: 11, slug: 'chapter-11', title: 'The Future of Nomadism',                       desc: "What's Next",      startComment: '<!-- Chapter 11: The Future', endComment: '<!-- Chapter 12: Entering' },
  { num: 12, slug: 'chapter-12', title: 'Entering the Digital Nomad Market',            desc: 'For Brands',       startComment: '<!-- Chapter 12: Entering', endComment: '<!-- Conclusion: More Than' },
];

const conclusionStart = '<!-- Conclusion: More Than';
const conclusionEnd   = '<!-- Read Next: after Conclusion';

function extractLines(startComment, endComment) {
  let startIdx = -1;
  let endIdx   = -1;
  for (let i = 0; i < lines.length; i++) {
    if (startIdx === -1 && lines[i].includes(startComment)) startIdx = i;
    if (startIdx !== -1 && endIdx === -1 && i > startIdx && lines[i].includes(endComment)) {
      endIdx = i;
      break;
    }
  }
  if (startIdx === -1) throw new Error(`Start comment not found: ${startComment}`);
  if (endIdx   === -1) throw new Error(`End comment not found: ${endComment} (start was line ${startIdx})`);
  // Dedent by 12 spaces (the indentation level in the original file)
  return lines.slice(startIdx, endIdx).map(l => l.startsWith('            ') ? l.slice(12) : l).join('\n');
}

function seoDescription(chapterNum, title) {
  const descs = {
    1:  'Learn what the digital nomad lifestyle really means — from economic autonomy and temporal flexibility to global citizenship and who it is for.',
    2:  'Explore the complete history of digital nomadism from pre-internet pioneers to the pandemic revolution and the institutionalization of remote work.',
    3:  'Who are digital nomads? Discover the demographics, types, motivations, myths, and evolving identity of the global nomad community.',
    4:  'Understand the tools and infrastructure that make the digital nomad lifestyle possible — coworking, coliving, visas, insurance, and banking.',
    5:  'Discover the best digital nomad destinations, top cities like Chiang Mai and Lisbon, emerging locations, and seasonal travel circuits.',
    6:  'A complete guide to digital nomad visas, tax residency, banking, health insurance, and staying legally compliant on the road.',
    7:  'How digital nomads earn, manage money, leverage geoarbitrage, bank across borders, handle taxes, and plan for the future.',
    8:  'How to thrive while constantly on the move — managing health, building relationships, avoiding burnout, and finding daily rhythm.',
    9:  'Explore the full ecosystem of services that support digital nomads: coworking, fintech, insurance, legal tools, job boards, and events.',
    10: 'An honest look at the controversies around digital nomadism — gentrification, cultural insensitivity, environmental impact, and privilege.',
    11: 'The future of digital nomadism: slow travel, remote-first societies, nomad villages, new technologies, and ethical accountability.',
    12: 'How to build a brand in the digital nomad space — community embedding, organic growth, events, partnerships, and integrity-first strategy.',
  };
  return descs[chapterNum] || `Chapter ${chapterNum}: ${title}`;
}

function buildChapterPage(ch, content, prevSlug, nextSlug) {
  const prevLink = prevSlug ? `/digital-nomad-wiki/${prevSlug}/` : '/digital-nomad-wiki/';
  const nextLink = nextSlug ? `/digital-nomad-wiki/${nextSlug}/` : '/digital-nomad-wiki/';
  const prevLabel = ch.num === 1 ? 'Introduction' : `Chapter ${ch.num - 1}`;
  const nextLabel = ch.num === 12 ? 'Conclusion' : `Chapter ${ch.num + 1}`;

  return `---
export const prerender = true;

import Layout, { type SEOProps } from '~/layouts/Layout.astro';
import WikiSidebar from '~/components/WikiSidebar.astro';

const seo: SEOProps = {
  title: 'Chapter ${ch.num}: ${ch.title} – Digital Nomad Encyclopedia',
  description: '${seoDescription(ch.num, ch.title)}',
  keywords: 'digital nomad ${ch.desc.toLowerCase()}, digital nomad guide chapter ${ch.num}, ${ch.title.toLowerCase()}, nomad encyclopedia',
  ldJSON: {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Chapter ${ch.num}: ${ch.title}',
    description: '${seoDescription(ch.num, ch.title)}',
    url: \`\${Astro.site}digital-nomad-wiki/${ch.slug}/\`,
    isPartOf: {
      '@type': 'Book',
      name: 'Digital Nomad Encyclopedia',
      url: \`\${Astro.site}digital-nomad-wiki/\`,
    },
    author: {
      '@type': 'Organization',
      name: 'Nomad Magazine',
      url: \`\${Astro.site}\`,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Nomad Magazine',
      url: \`\${Astro.site}\`,
    },
  },
};
---

<Layout seo={seo}>
  <a href="#main-content" class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-yellow-400 text-black px-3 py-1 rounded text-sm font-medium z-50">Skip to main content</a>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-7xl mx-auto flex">
      <WikiSidebar currentChapter={${ch.num}} />

      <main id="main-content" class="flex-1 min-w-0">
        <div class="max-w-3xl mx-auto px-4 sm:px-6 py-8 lg:py-12">

          <!-- Breadcrumb -->
          <nav class="flex items-center gap-2 text-xs text-gray-500 mb-8" aria-label="Breadcrumb">
            <a href="/digital-nomad-wiki/" class="hover:text-gray-700">Encyclopedia</a>
            <span aria-hidden="true">›</span>
            <span class="text-gray-700 font-medium">Chapter ${ch.num}</span>
          </nav>

${content}

          <!-- Prev / Next Navigation -->
          <div class="flex items-center justify-between gap-4 mt-16 pt-8 border-t border-gray-200">
            <a href="${prevLink}" class="flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors max-w-[48%]">
              <svg class="w-4 h-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
              <span><span class="block text-xs text-gray-400">${prevLabel}</span><span class="font-medium">${ch.num === 1 ? 'Introduction' : chapters[ch.num - 2]?.title || ''}</span></span>
            </a>
            <a href="${nextLink}" class="flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors max-w-[48%] text-right ml-auto">
              <span><span class="block text-xs text-gray-400">${nextLabel}</span><span class="font-medium">${ch.num === 12 ? 'Conclusion' : chapters[ch.num]?.title || ''}</span></span>
              <svg class="w-4 h-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
            </a>
          </div>

          <!-- Suggest Edit -->
          <div class="mt-6 text-right">
            <a href="mailto:hey@nomad-magazine.com?subject=Wiki%20Edit%20-%20Chapter%20${ch.num}&body=Chapter%3A%20${encodeURIComponent('Chapter ' + ch.num + ' - ' + ch.title)}%0ASection%3A%20%0AProposed%20Change%3A%20%0AReason%3A%20"
              class="inline-flex items-center text-xs text-gray-400 hover:text-gray-600 transition-colors">
              <svg class="mr-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
              Suggest an Edit
            </a>
          </div>
        </div>
      </main>
    </div>
  </div>
</Layout>
`;
}

// ─── Extract content and write chapter files ─────────────────────────────────
for (let i = 0; i < chapters.length; i++) {
  const ch       = chapters[i];
  const prevSlug = i === 0 ? null : chapters[i - 1].slug;
  const nextSlug = i === chapters.length - 1 ? null : chapters[i + 1].slug;

  console.log(`Extracting chapter ${ch.num}: ${ch.startComment} → ${ch.endComment}`);
  const content = extractLines(ch.startComment, ch.endComment);
  const page    = buildChapterPage(ch, content, prevSlug, nextSlug);
  writeFileSync(join(outDir, `${ch.slug}.astro`), page, 'utf8');
  console.log(`  ✓ Wrote ${ch.slug}.astro`);
}

// ─── Extract conclusion content ───────────────────────────────────────────────
const conclusionContent = extractLines(conclusionStart, conclusionEnd);
const conclusionPage = `---
export const prerender = true;

import Layout, { type SEOProps } from '~/layouts/Layout.astro';
import WikiSidebar from '~/components/WikiSidebar.astro';

const seo: SEOProps = {
  title: 'Conclusion: A Movement Reshaping the World – Digital Nomad Encyclopedia',
  description: 'The conclusion of the Digital Nomad Encyclopedia — a reflection on freedom, flexibility, and building a life of purpose in a globally connected world.',
  keywords: 'digital nomad conclusion, nomad movement, digital nomad future, nomad lifestyle guide',
  ldJSON: {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Conclusion: More Than a Lifestyle — A Movement Reshaping the World',
    description: 'The conclusion of the Digital Nomad Encyclopedia.',
    url: \`\${Astro.site}digital-nomad-wiki/conclusion/\`,
    isPartOf: {
      '@type': 'Book',
      name: 'Digital Nomad Encyclopedia',
      url: \`\${Astro.site}digital-nomad-wiki/\`,
    },
    author: { '@type': 'Organization', name: 'Nomad Magazine', url: \`\${Astro.site}\` },
    publisher: { '@type': 'Organization', name: 'Nomad Magazine', url: \`\${Astro.site}\` },
  },
};
---

<Layout seo={seo}>
  <a href="#main-content" class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-yellow-400 text-black px-3 py-1 rounded text-sm font-medium z-50">Skip to main content</a>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-7xl mx-auto flex">
      <WikiSidebar currentChapter={13} />

      <main id="main-content" class="flex-1 min-w-0">
        <div class="max-w-3xl mx-auto px-4 sm:px-6 py-8 lg:py-12">

          <!-- Breadcrumb -->
          <nav class="flex items-center gap-2 text-xs text-gray-500 mb-8" aria-label="Breadcrumb">
            <a href="/digital-nomad-wiki/" class="hover:text-gray-700">Encyclopedia</a>
            <span aria-hidden="true">›</span>
            <span class="text-gray-700 font-medium">Conclusion</span>
          </nav>

${conclusionContent}

          <!-- Prev / Next Navigation -->
          <div class="flex items-center justify-between gap-4 mt-16 pt-8 border-t border-gray-200">
            <a href="/digital-nomad-wiki/chapter-12/" class="flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors">
              <svg class="w-4 h-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
              <span><span class="block text-xs text-gray-400">Chapter 12</span><span class="font-medium">Entering the Market</span></span>
            </a>
            <a href="/digital-nomad-wiki/" class="flex items-center gap-2 px-4 py-3 bg-yellow-400 hover:bg-yellow-500 text-black rounded-lg text-sm font-semibold transition-colors ml-auto">
              Back to Overview →
            </a>
          </div>

          <!-- Suggest Edit -->
          <div class="mt-6 text-right">
            <a href="mailto:hey@nomad-magazine.com?subject=Wiki%20Edit%20-%20Conclusion"
              class="inline-flex items-center text-xs text-gray-400 hover:text-gray-600 transition-colors">
              <svg class="mr-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
              Suggest an Edit
            </a>
          </div>
        </div>
      </main>
    </div>
  </div>
</Layout>
`;
writeFileSync(join(outDir, 'conclusion.astro'), conclusionPage, 'utf8');
console.log('  ✓ Wrote conclusion.astro');
console.log('\nDone! All chapter pages generated.');
