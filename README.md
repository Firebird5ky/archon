# ARCHON

## Setup

1. Clone or download this project
2. Run `npm install`
3. Copy `.env.example` to `.env.local`
4. Fill in your Supabase values from:
   - Supabase dashboard → Settings → API
   - NEXT_PUBLIC_SUPABASE_URL = your project URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY = your anon/public key
5. Run `npm run dev` to test locally at localhost:3000

## Deploy to Vercel

1. Push this folder to a GitHub repo
2. Go to vercel.com → New Project → Import from GitHub
3. Add environment variables in Vercel's dashboard (same as .env.local)
4. Deploy — Vercel gives you a public URL instantly

## After deploying

Go back to Discord Developer Portal → OAuth2 → Redirects
Add your Vercel URL as a redirect:
`https://your-vercel-url.vercel.app/auth/callback`

Also add it in Supabase → Authentication → URL Configuration → Redirect URLs
