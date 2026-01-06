import type {
  Article,
  BlogPosting,
  FAQPage,
  ImageObject,
  Organization,
  Person,
  Question,
  SearchAction,
  Service,
  Thing,
  WebPage,
  WebSite,
  WithContext,
} from 'schema-dts'

// Site constants
const SITE_URL = 'https://nomad-magazine.com/'
const SITE_NAME = 'Nomad Magazine'
const LOGO_URL = `${SITE_URL}logo.svg`

// Helper to ensure trailing slash
export const ensureTrailingSlash = (urlString: string | URL): string => {
  const str = urlString.toString()
  if (/\.[a-zA-Z0-9]+$/.test(str)) return str
  return str.endsWith('/') ? str : `${str}/`
}

// Default organization schema
export const defaultOrganization: Organization = {
  '@type': 'Organization',
  name: SITE_NAME,
  logo: {
    '@type': 'ImageObject',
    url: LOGO_URL,
    width: '200',
    height: '60',
  } as ImageObject,
  sameAs: [
    'https://twitter.com/nomadgossipmag',
    'https://www.instagram.com/nomadgossipmag/',
    'https://www.youtube.com/@nomadmagazine',
    'https://www.linkedin.com/company/nomad-magazine/',
  ],
}

// Default publisher (simplified for blog posts)
export const defaultPublisher: Organization = {
  '@type': 'Organization',
  name: SITE_NAME,
  logo: {
    '@type': 'ImageObject',
    url: LOGO_URL,
  } as ImageObject,
}

// Create a WebSite schema
export function createWebSiteSchema(options?: {
  url?: string
  description?: string
  searchUrlTemplate?: string
}): WithContext<WebSite> {
  const url = options?.url || SITE_URL
  const description = options?.description || 'The first global digital nomad magazine'
  const searchUrlTemplate = options?.searchUrlTemplate || `${SITE_URL}blog/?q={search_term_string}`

  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: ensureTrailingSlash(url),
    description,
    publisher: defaultOrganization,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: searchUrlTemplate,
      },
      'query-input': 'required name=search_term_string',
    } as SearchAction,
  }
}

// Create a WebPage schema
export function createWebPageSchema(options: {
  name: string
  url: string
  description: string
  image?: string
}): WithContext<WebPage> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: options.name,
    url: ensureTrailingSlash(options.url),
    description: options.description,
    publisher: defaultOrganization,
    ...(options.image && { image: options.image }),
  }
}

// Create a BlogPosting schema
export function createBlogPostingSchema(options: {
  headline: string
  description: string
  image: string
  url: string
  datePublished?: string
  dateModified?: string
  author?: {
    name: string
    url?: string
  }
  keywords?: string
  articleSection?: string
}): WithContext<BlogPosting> {
  const author: Person = {
    '@type': 'Person',
    name: options.author?.name || 'Martin Donadieu',
    url: options.author?.url || 'https://github.com/riderx',
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: options.headline,
    description: options.description,
    image: options.image,
    author,
    publisher: defaultPublisher,
    ...(options.datePublished && { datePublished: options.datePublished }),
    ...(options.dateModified && { dateModified: options.dateModified }),
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': ensureTrailingSlash(options.url),
    } as WebPage,
    ...(options.articleSection && { articleSection: options.articleSection }),
    ...(options.keywords && { keywords: options.keywords }),
  }
}

// Create an Article schema
export function createArticleSchema(options: {
  headline: string
  description: string
  image?: string
  url: string
  datePublished?: string
  dateModified?: string
  author?: {
    name: string
    url?: string
  }
}): WithContext<Article> {
  const author: Person = {
    '@type': 'Person',
    name: options.author?.name || 'Martin Donadieu',
    url: options.author?.url || 'https://github.com/riderx',
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: options.headline,
    description: options.description,
    author,
    publisher: defaultPublisher,
    ...(options.image && { image: options.image }),
    ...(options.datePublished && { datePublished: options.datePublished }),
    ...(options.dateModified && { dateModified: options.dateModified }),
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': ensureTrailingSlash(options.url),
    } as WebPage,
  }
}

// Create a Service schema
export function createServiceSchema(options: {
  name: string
  description: string
  url: string
  provider?: Organization
  areaServed?: string
  serviceType?: string
}): WithContext<Service> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: options.name,
    description: options.description,
    url: ensureTrailingSlash(options.url),
    provider: options.provider || defaultOrganization,
    ...(options.areaServed && { areaServed: options.areaServed }),
    ...(options.serviceType && { serviceType: options.serviceType }),
  }
}

// Create a FAQPage schema
export function createFAQPageSchema(
  questions: Array<{ question: string; answer: string }>
): WithContext<FAQPage> {
  const mainEntity: Question[] = questions.map((q) => ({
    '@type': 'Question',
    name: q.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: q.answer,
    },
  }))

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity,
  }
}

// Create an Organization schema (standalone)
export function createOrganizationSchema(options?: {
  name?: string
  url?: string
  logo?: string
  description?: string
  sameAs?: string[]
}): WithContext<Organization> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: options?.name || SITE_NAME,
    url: options?.url || SITE_URL,
    logo: {
      '@type': 'ImageObject',
      url: options?.logo || LOGO_URL,
    } as ImageObject,
    ...(options?.description && { description: options.description }),
    sameAs: options?.sameAs || [
      'https://twitter.com/nomadgossipmag',
      'https://www.instagram.com/nomadgossipmag/',
      'https://www.youtube.com/@nomadmagazine',
      'https://www.linkedin.com/company/nomad-magazine/',
    ],
  }
}

// Type for JSON-LD that can be used in components
export type JsonLdSchema =
  | WithContext<WebSite>
  | WithContext<WebPage>
  | WithContext<BlogPosting>
  | WithContext<Article>
  | WithContext<Service>
  | WithContext<FAQPage>
  | WithContext<Organization>
  | WithContext<Thing>

// Re-export types that pages might need
export type {
  Article,
  BlogPosting,
  FAQPage,
  ImageObject,
  Organization,
  Person,
  Service,
  WebPage,
  WebSite,
  WithContext,
}
