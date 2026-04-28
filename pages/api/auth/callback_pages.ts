import { createClient } from '@/lib/supabase'
import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const code = req.query.code as string
  const origin = `https://${req.headers.host}`

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      res.redirect('/dashboard')
      return
    }
  }

  res.redirect('/login?error=auth_failed')
}
