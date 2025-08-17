import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/supabase'

// Production Supabase credentials
export const supabaseUrl = 'https://kmsroigetiipulnosooy.supabase.co'
export const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imttc3JvaWdldGlpcHVsbm9zb295Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0NDk0MzcsImV4cCI6MjA3MTAyNTQzN30.yKGKsfDA4WOAwAOOX6znSNfcT6yL7Y0RWLBc2ylktCI'

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

