import { serviceClient } from './directory-vote-cast'

type VoteUser = {
  id: string
  is_anonymous?: boolean
  email?: string
  app_metadata?: Record<string, unknown>
}

export function isDirectoryVoteVerified(user: VoteUser): boolean {
  if (user.is_anonymous === false) return true
  if (user.is_anonymous === true) return user.app_metadata?.vote_verified === true
  return false
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