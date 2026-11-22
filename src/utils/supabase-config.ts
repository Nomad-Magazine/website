const defaultUrl = 'https://kmsroigetiipulnosooy.supabase.co'
const defaultAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imttc3JvaWdldGlpcHVsbm9zb295Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0NDk0MzcsImV4cCI6MjA3MTAyNTQzN30.yKGKsfDA4WOAwAOOX6znSNfcT6yL7Y0RWLBc2ylktCI'

export function getSupabaseConfig() {
  // For now, always use defaults. SUPABASE_URL and SUPABASE_ANON_KEY env vars can be added later if needed.
  // The Cloudflare Workers runtime 'env' binding is not accessible in Astro utility modules.
  return {
    url: defaultUrl,
    anonKey: defaultAnonKey
  }
}
