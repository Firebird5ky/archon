// @ts-nocheck
import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@/lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const code = req.query.code as string
  if (code) {
    const supabase = createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data.user) {
      try {
        const username = data.user.user_metadata?.full_name || data.user.user_metadata?.name
        await supabase.from('members').upsert({
          id: BigInt(data.user.user_metadata.provider_id),
          username,
          display_name: data.user.user_metadata?.custom_claims?.global_name,
          last_active: new Date().toISOString(),
          auth_type: 'discord',
        }, { onConflict: 'id', ignoreDuplicates: false })
      } catch(e) {}
      res.redirect('/dashboard')
      return
    }
  }
  res.redirect('/login?error=auth_failed')
}
