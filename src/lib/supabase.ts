import { createClient } from '@supabase/supabase-js'

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fdgtzodvlkokgxwwdbxb.supabase.co'
// Clean up the URL by stripping trailing /rest/v1/ or /rest/v1
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '')

const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
})
