export type DirectoryVotingSurface = 'main' | 'category' | 'country' | 'continent'

export const DIRECTORY_VOTING_PAGES: Record<DirectoryVotingSurface, boolean> = {
  main: false,
  category: true,
  country: true,
  continent: true,
}

export const DIRECTORY_TURNSTILE_SITE_KEY = '0x4AAAAAACXWfgpGaqB_A50e'