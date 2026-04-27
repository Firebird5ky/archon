'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Result = {
  type: string
  title: string
  path: string[]
  snippet: string
  tags: string[]
}

export default function Dashboard() {
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState('all')
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  useEffect(() => {
    search(query, tab)
  }, [query, tab])

  async function search(q: string, t: string) {
    setLoading(true)
    const results: Result[] = []

    if (t === 'all' || t === 'factions') {
      let fq = supabase.from('factions').select('*, rulers(member_id, title), faction_members(count)').eq('is_active', true)
      if (q) fq = fq.ilike('name', `%${q}%`)
      const { data } = await fq.limit(10)
      data?.forEach(f => {
        results.push({
          type: 'faction',
          title: `${f.name} — Faction`,
          path: ['factions', f.name.toLowerCase().replace(/\s+/g, '-')],
          snippet: f.description || `Faction tag: [${f.tag}]. Part of the ARCHON network.`,
          tags: [f.tag, f.is_active ? 'Active' : 'Inactive'],
        })
      })
    }

    if (t === 'all' || t === 'members') {
      let mq = supabase.from('members').select('*, faction_members(factions(name), rank)').eq('is_banned', false)
      if (q) mq = mq.ilike('username', `%${q}%`)
      const { data } = await mq.limit(10)
      data?.forEach(m => {
        const faction = m.faction_members?.[0]?.factions?.name
        const rank = m.faction_members?.[0]?.rank
        results.push({
          type: 'member',
          title: `${m.display_name || m.username} — Member`,
          path: ['members', m.username.toLowerCase()],
          snippet: faction
            ? `Member of ${faction}. Rank: ${rank}. Tier: ${m.tier}. XP: ${m.total_xp.toLocaleString()}.`
            : `Independent member. Tier: ${m.tier}. XP: ${m.total_xp.toLocaleString()}.`,
          tags: [m.tier, faction || 'No faction'],
        })
      })
    }

    if (t === 'all' || t === 'pages') {
      let pq = supabase.from('pages').select('*, factions(name)').eq('is_published', true)
      if (q) pq = pq.ilike('title', `%${q}%`)
      const { data } = await pq.limit(10)
      data?.forEach(p => {
        results.push({
          type: 'page',
          title: p.title,
          path: ['pages', p.factions?.name?.toLowerCase() || 'global', p.slug],
          snippet: p.body.substring(0, 160) + (p.body.length > 160 ? '...' : ''),
          tags: [p.factions?.name || 'Global', p.is_pinned ? 'Pinned' : ''],
        })
      })
    }

    setResults(results)
    setLoading(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const tabs = ['all', 'factions', 'members', 'pages']

  return (
    <div style={{ fontFamily: 'arial, sans-serif', minHeight: '100vh', background: 'var(--bg)' }}>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px', padding: '12px 24px', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-1px', flexShrink: 0 }}>
          <span style={{
            background: 'linear-gradient(180deg, #1a1a1a 0%, #3d2e00 40%, #c8960c 75%, #ffd700 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>ARCHON</span>
        </span>

        <div style={{ flex: 1, maxWidth: '580px', position: 'relative' }}>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search factions, members, pages..."
            style={{
              width: '100%',
              padding: '10px 16px',
              border: '1px solid var(--border)',
              borderRadius: '24px',
              fontSize: '15px',
              background: 'var(--bg)',
              color: 'var(--text)',
              outline: 'none',
            }}
          />
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
            {user?.user_metadata?.full_name}
          </span>
          <button
            onClick={handleSignOut}
            style={{ fontSize: '13px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', padding: '0 24px', borderBottom: '1px solid var(--border)' }}>
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '10px 16px',
              fontSize: '13px',
              background: 'none',
              border: 'none',
              borderBottom: tab === t ? '3px solid var(--accent)' : '3px solid transparent',
              color: tab === t ? 'var(--accent)' : 'var(--muted)',
              cursor: 'pointer',
              textTransform: 'capitalize',
              fontFamily: 'arial, sans-serif',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Results */}
      <div style={{ maxWidth: '650px', padding: '20px 24px' }}>
        {loading && (
          <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '16px' }}>Searching...</p>
        )}
        {!loading && results.length > 0 && (
          <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '20px' }}>
            About {results.length} result{results.length !== 1 ? 's' : ''}
          </p>
        )}
        {!loading && results.length === 0 && query && (
          <p style={{ color: 'var(--muted)', fontSize: '14px', marginTop: '40px' }}>
            No results for "{query}"
          </p>
        )}

        {results.map((r, i) => (
          <div key={i} style={{ marginBottom: '28px' }}>
            <div style={{ fontSize: '12px', color: 'var(--path)', marginBottom: '2px' }}>
              {r.path.join(' › ')}
            </div>
            <div style={{ fontSize: '18px', color: 'var(--link)', cursor: 'pointer', marginBottom: '4px' }}>
              {r.title}
            </div>
            <div style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: '1.6', marginBottom: '6px' }}>
              {r.snippet}
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {r.tags.filter(Boolean).map((tag, ti) => (
                <span key={ti} style={{
                  fontSize: '11px',
                  padding: '2px 8px',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  color: 'var(--muted)',
                }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
