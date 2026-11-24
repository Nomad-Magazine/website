import { serviceClient } from './directory-vote-cast'

type VoteUser = {
  id: string
  is_anonymous?: boolean
  email?: string
  app_metadata?: Record<string, unknown>
}

export function isDirectoryVoteVerified(user: VoteUser): boolean {
  if (!user.is_anonymous) return true
  return user.app_metadata?.vote_verified === true
}

export function needsDirectoryTurnstile(user: VoteUser | null | undefined): boolean {
  return !user || !isDirectoryVoteVerified(user)
}

export async function markDirectoryVoteVerified(userId: string): Promise<void> {
  const client = serviceClient()
  const { error } = await client.auth.admin.updateUserById(userId, {
    app_metadata: { vote_verified: true, vote_verified_at: new Date().toISOString() },
  })
  if (error) throw error
}