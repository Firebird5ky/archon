'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Tab = 'all' | 'factions' | 'members' | 'pages'

const TIERS: Record<string, { label: string; color: string; perks: string[] }> = {
  free:   { label: 'Free',   color: '#9aa0a6', perks: ['View all public pages', 'Join one faction', 'Basic search'] },
  bronze: { label: 'Bronze', color: '#cd7f32', perks: ['Everything in Free', 'Join up to 2 factions', 'Submit build requests', 'Faction chat access'] },
  silver: { label: 'Silver', color: '#aaa9ad', perks: ['Everything in Bronze', 'Publish posts in your faction', 'Priority build requests', 'Custom profile badge'] },
  gold:   { label: 'Gold',   color: '#ffd700', perks: ['Everything in Silver', 'Publish and edit pages', 'Access to exclusive faction spaces', 'Direct ruler messaging'] },
}

export default function Dashboard() {
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<Tab>('all')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [member, setMember] = useState<any>(null)
  const [factions, setFactions] = useState<any[]>([])
  const [showTiers, setShowTiers] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user)
      if (data.user) {
        const discordId = BigInt(data.user.user_metadata.provider_id)
        const { data: m } = await supabase.from('members').select('*').eq('id', discordId).single()
        setMember(m)
        const { data: f } = await supabase.from('factions').select('*').eq('is_active', true).order('name')
        setFactions(f || [])
      }
    })
  }, [])

  useEffect(() => { search(query, tab) }, [query, tab])

  async function search(q: string, t: Tab) {
    setLoading(true)
    const results: any[] = []
    if (t === 'all' || t === 'factions') {
      let fq = supabase.from('factions').select('*').eq('is_active', true)
      if (q) fq = fq.ilike('name', '%' + q + '%')
      const { data } = await fq.limit(8)
      data?.forEach(f => results.push({ type: 'faction', title: f.name + ' — Faction', path: ['factions', f.name], snippet: f.description || 'Faction tag: [' + f.tag + ']', tags: [f.tag], href: '/f/' + f.name }))
    }
    if (t === 'all' || t === 'members') {
      let mq = supabase.from('members').select('*, faction_members(factions(name), rank)').eq('is_banned', false)
      if (q) mq = mq.ilike('username', '%' + q + '%')
      const { data } = await mq.limit(8)
      data?.forEach(m => {
        const faction = m.faction_members?.[0]?.factions?.name
        results.push({ type: 'member', title: (m.display_name || m.username) + ' — Member', path: ['members', m.username], snippet: faction ? 'Member of ' + faction + '. Tier: ' + m.tier + '.' : 'Independent. Tier: ' + m.tier + '.', tags: [m.tier, faction].filter(Boolean) })
      })
    }
    if (t === 'all' || t === 'pages') {
      let pq = supabase.from('pages').select('*, factions(name)').eq('is_published', true)
      if (q) pq = pq.ilike('title', '%' + q + '%')
      const { data } = await pq.limit(8)
      data?.forEach(p => results.push({ type: 'page', title: p.title, path: ['factions', p.factions?.name, p.slug].filter(Boolean), snippet: p.body.substring(0, 160) + (p.body.length > 160 ? '...' : ''), tags: [p.factions?.name].filter(Boolean), href: '/f/' + p.factions?.name + '/' + p.slug }))
    }
    setResults(results)
    setLoading(false)
  }

  const tier = member ? (TIERS[member.tier] || TIERS.free) : TIERS.free
  const isDeity = member?.role === 'deity'

  return (
    <div style={{ fontFamily: 'arial, sans-serif', minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px', padding: '12px 24px', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: '22px', fontWeight: 700, background: 'linear-gradient(180deg,#1a1a1a 0%,#c8960c 75%,#ffd700 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', flexShrink: 0 }}>ARCHON</span>
        <div style={{ flex: 1, maxWidth: '580px' }}>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search factions, members, pages..." style={{ width: '100%', padding: '10px 16px', border: '1px solid var(--border)', borderRadius: '24px', fontSize: '15px', background: 'var(--bg)', color: 'var(--text)', outline: 'none', fontFamily: 'arial, sans-serif' }} />
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
          {member && <button onClick={() => setShowTiers(!showTiers)} style={{ fontSize: '12px', padding: '3px 10px', border: '1px solid ' + tier.color, color: tier.color, background: 'none', borderRadius: '12px', cursor: 'pointer', fontFamily: 'arial, sans-serif' }}>{tier.label}</button>}
          {isDeity && <Link href="/admin" style={{ fontSize: '13px', padding: '4px 10px', background: '#ea4335', color: '#fff', borderRadius: '4px', textDecoration: 'none' }}>Admin</Link>}
          <span style={{ fontSize: '13px', color: 'var(--muted)' }}>{user?.user_metadata?.full_name}</span>
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/login') }} style={{ fontSize: '13px', color: '#4285f4', background: 'none', border: 'none', cursor: 'pointer' }}>Sign out</button>
        </div>
      </div>

      {showTiers && (
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ maxWidth: '860px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            {Object.entries(TIERS).map(([key, t]) => (
              <div key={key} style={{ border: '1px solid ' + (member?.tier === key ? t.color : 'var(--border)'), borderRadius: '8px', padding: '12px' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: t.color, marginBottom: '8px' }}>{t.label}</div>
                {t.perks.map((p, i) => <div key={i} style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '3px' }}>· {p}</div>)}
                {member?.tier === key && <div style={{ fontSize: '11px', color: t.color, marginTop: '8px', fontWeight: 600 }}>YOUR TIER</div>}
              </div>
            ))}
          </div>
          <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '12px' }}>Tiers are assigned by the admin. Contact a ruler or deity to upgrade.</p>
        </div>
      )}

      <div style={{ display: 'flex', padding: '0 24px', borderBottom: '1px solid var(--border)' }}>
        {(['all', 'factions', 'members', 'pages'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '10px 16px', fontSize: '13px', background: 'none', border: 'none', borderBottom: tab === t ? '3px solid #4285f4' : '3px solid transparent', color: tab === t ? '#4285f4' : 'var(--muted)', cursor: 'pointer', textTransform: 'capitalize', fontFamily: 'arial, sans-serif' }}>{t}</button>
        ))}
      </div>

      <div style={{ display: 'flex', padding: '16px 24px', gap: '32px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {!query && results.length === 0 && !loading && (
            <div style={{ marginBottom: '24px' }}>
              <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '12px' }}>All Factions</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {factions.map(f => (
                  <Link key={f.id} href={'/f/' + f.name} style={{ padding: '6px 14px', border: '1px solid ' + (f.color || 'var(--border)'), borderRadius: '20px', fontSize: '13px', color: f.color || 'var(--text)', textDecoration: 'none' }}>[{f.tag}] {f.name}</Link>
                ))}
                {factions.length === 0 && <p style={{ fontSize: '13px', color: 'var(--muted)' }}>No factions yet.</p>}
              </div>
            </div>
          )}

          {loading && <p style={{ color: 'var(--muted)', fontSize: '13px' }}>Searching...</p>}
          {!loading && results.length > 0 && <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '20px' }}>About {results.length} result{results.length !== 1 ? 's' : ''}</p>}
          {!loading && results.length === 0 && query && <p style={{ color: 'var(--muted)', fontSize: '14px' }}>No results for "{query}"</p>}

          {results.map((r, i) => (
            <div key={i} style={{ marginBottom: '28px' }}>
              <div style={{ fontSize: '12px', color: '#188038', marginBottom: '2px' }}>{r.path.join(' › ')}</div>
              {r.href ? <Link href={r.href} style={{ fontSize: '18px', color: '#1a0dab', textDecoration: 'none', display: 'block', marginBottom: '4px' }}>{r.title}</Link> : <div style={{ fontSize: '18px', color: '#1a0dab', marginBottom: '4px' }}>{r.title}</div>}
              <div style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '6px' }}>{r.snippet}</div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {r.tags.map((tag: string, ti: number) => <span key={ti} style={{ fontSize: '11px', padding: '2px 8px', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--muted)' }}>{tag}</span>)}
              </div>
            </div>
          ))}
        </div>

        <div style={{ width: '240px', flexShrink: 0 }}>
          <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', marginBottom: '16px' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text)' }}>Network</div>
            </div>
            <div style={{ padding: '10px 16px', fontSize: '13px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--muted)' }}>Factions</span><span style={{ color: 'var(--text)', fontWeight: 500 }}>{factions.length}</span>
            </div>
            <div style={{ padding: '10px 16px', fontSize: '13px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--muted)' }}>Your tier</span><span style={{ color: tier.color, fontWeight: 500 }}>{tier.label}</span>
            </div>
          </div>
          {factions.length > 0 && (
            <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 16px' }}>
              <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '8px' }}>Quick Links</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {factions.slice(0, 6).map(f => <Link key={f.id} href={'/f/' + f.name} style={{ fontSize: '13px', color: '#4285f4', textDecoration: 'none' }}>{f.name}</Link>)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
