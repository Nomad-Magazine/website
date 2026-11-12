import { env } from 'cloudflare:workers'
const defaultUrl = 'https://kmsroigetiipulnosooy.supabase.co'
const defaultAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imttc3JvaWdldGlpcHVsbm9zb295Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0NDk0MzcsImV4cCI6MjA3MTAyNTQzN30.yKGKsfDA4WOAwAOOX6znSNfcT6yL7Y0RWLBc2ylktCI'

export function getSupabaseConfig() {
  const bindings = env as unknown as Record<string, string | undefined>
  return { url: bindings.SUPABASE_URL || defaultUrl, anonKey: bindings.SUPABASE_ANON_KEY || defaultAnonKey }
}
