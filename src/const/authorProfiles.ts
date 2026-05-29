/** Fallback author profile data for /authors/{slug}/ when frontmatter is missing fields. */
export const AUTHOR_PROFILES: Record<
  string,
  {
    image?: string
    instagram?: string
    website?: string
    bio?: string
  }
> = {
  'nina-hoeberichts': {
    image: '/images/author-nina-hoeberichts-profile.webp',
    instagram: 'https://www.instagram.com/thingsnomadsdo',
    website: 'https://www.thingsnomadsdo.com/',
    bio:
      'Nina Hoeberichts is the owner of <a href="https://www.thingsnomadsdo.com/" rel="noopener noreferrer">Things Nomads Do</a>, a travel and lifestyle blog for digital nomads and remote workers. Follow her on <a href="https://www.instagram.com/thingsnomadsdo" rel="noopener noreferrer" target="_blank" aria-label="Follow Nina Hoeberichts on Instagram (opens in new tab)">Instagram @thingsnomadsdo</a>.',
  },
}
