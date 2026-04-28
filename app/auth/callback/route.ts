import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      const response = NextResponse.redirect(`${origin}/dashboard`)
      
      // Set auth cookies manually
      const { access_token, refresh_token } = data.session
      response.cookies.set('sb-access-token', access_token, { 
        httpOnly: true, 
        secure: true, 
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7
      })
      response.cookies.set('sb-refresh-token', refresh_token, { 
        httpOnly: true, 
        secure: true, 
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7
      })

      // Sync to members table
      try {
        await supabase.from('members').upsert({
          id: BigInt(data.user.user_metadata.provider_id),
          username: data.user.user_metadata.full_name || data.user.user_metadata.name,
          display_name: data.user.user_metadata.custom_claims?.global_name,
          last_active: new Date().toISOString(),
        }, { onConflict: 'id', ignoreDuplicates: false })
      } catch(e) {}

      return response
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
