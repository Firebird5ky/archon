// @ts-nocheck
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

let client: any = null

export function createClient() {
  if (client) return client
  client = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: 'pkce',
        persistSession: true,
        detectSessionInUrl: true,
        storageKey: 'archon-auth',
      }
    }
  )
  return client
}
