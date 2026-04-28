import { createClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      try {
        await supabase.from('members').upsert({
          id: BigInt(data.user.user_metadata.provider_id),
          username: data.user.user_metadata.full_name || data.user.user_metadata.name,
          display_name: data.user.user_metadata.custom_claims?.global_name,
          last_active: new Date().toISOString(),
        }, { onConflict: 'id', ignoreDuplicates: false })
      } catch(e) {}

      return NextResponse.redirect(`${origin}/dashboard`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
