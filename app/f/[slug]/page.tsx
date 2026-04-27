'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

export default function FactionPage() {
  const [faction, setFaction] = useState<any>(null)
  const [pages, setPages] = useState<any[]>([])
  const [posts, setPosts] = useState<any[]>([])
  const [member, setMember] = useState<any>(null)
  const [isRuler, setIsRuler] = useState(false)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string

  useEffect(() => {
    load()
  }, [slug])

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const discordId = BigInt(user.user_metadata.provider_id)

    const [fRes, mRes] = await Promise.all([
      supabase.from('factions').select('*, rulers(member_id, title, members(username))').eq('name', decodeURIComponent(slug)).single(),
      supabase.from('members').select('*').eq('id', discordId).single(),
    ])

    if (fRes.error || !fRes.data) { setLoading(false); return }
    setFaction(fRes.data)
    setMember(mRes.data)

    const rulerMemberIds = fRes.data.rulers?.map((r: any) => r.member_id) || []
    setIsRuler(rulerMemberIds.includes(discordId.toString()) || mRes.data?.role === 'deity')

    const [pagesRes, postsRes] = await Promise.all([
      supabase.from('pages').select('*, members(username)').eq('faction_id', fRes.data.id).eq('is_published', true).order('is_pinned', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('posts').select('*, members(username)').eq('faction_id', fRes.data.id).order('is_pinned', { ascending: false }).order('created_at', { ascending: false }),
    ])
    setPages(pagesRes.data || [])
    setPosts(postsRes.data || [])
    setLoading(false)
  }

  if (loading) return <div style={{ padding: '40px', fontFamily: 'arial, sans-serif', color: 'var(--muted)' }}>Loading...</div>
  if (!faction) return <div style={{ padding: '40px', fontFamily: 'arial, sans-serif', color: 'var(--text)' }}>Faction not found. <Link href="/dashboard" style={{ color: '#4285f4' }}>Back</Link></div>

  const ruler = faction.rulers?.[0]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'arial, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 24px', borderBottom: '1px solid var(--border)' }}>
        <Link href="/dashboard" style={{ fontSize: '20px', fontWeight: 700, background: 'linear-gradient(180deg,#1a1a1a 0%,#c8960c 75%,#ffd700 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', textDecoration: 'none' }}>ARCHON</Link>
        <span style={{ color: 'var(--muted)', fontSize: '14px' }}>›</span>
        <span style={{ fontSize: '14px', color: 'var(--text)', fontWeight: 500 }}>{faction.name}</span>
        <span style={{ fontSize: '12px', padding: '2px 8px', border: `1px solid ${faction.color || 'var(--border)'}`, color: faction.color || 'var(--muted)', borderRadius: '4px' }}>[{faction.tag}]</span>
        {isRuler && (
          <Link href={`/f/${slug}/new`} style={{ marginLeft: 'auto', padding: '6px 14px', background: '#4285f4', color: '#fff', borderRadius: '4px', fontSize: '13px', textDecoration: 'none' }}>+ New Page</Link>
        )}
      </div>

      <div style={{ maxWidth: '860px', padding: '24px' }}>
        <div style={{ display: 'flex', gap: '32px' }}>
          <div style={{ flex: 1 }}>

            {posts.length > 0 && (
              <div style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '13px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Announcements</h2>
                {posts.map(p => (
                  <div key={p.id} style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
                    {p.is_pinned && <span style={{ fontSize: '11px', color: '#4285f4', marginBottom: '4px', display: 'block' }}>PINNED</span>}
                    {p.title && <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>{p.title}</div>}
                    <div style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.7 }}>{p.body}</div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '6px' }}>{p.members?.username} · {new Date(p.created_at).toLocaleDateString()}</div>
                  </div>
                ))}
              </div>
            )}

            <h2 style={{ fontSize: '13px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Pages</h2>
            {pages.length === 0 && <p style={{ color: 'var(--muted)', fontSize: '14px' }}>No pages published yet.</p>}
            {pages.map(p => (
              <div key={p.id} style={{ marginBottom: '24px' }}>
                {p.is_pinned && <span style={{ fontSize: '11px', color: '#4285f4' }}>PINNED · </span>}
                <div style={{ fontSize: '12px', color: '#188038', marginBottom: '2px' }}>factions › {faction.name.toLowerCase()} › {p.slug}</div>
                <Link href={`/f/${slug}/${p.slug}`} style={{ fontSize: '18px', color: '#1a0dab', textDecoration: 'none', display: 'block', marginBottom: '4px' }}>{p.title}</Link>
                <div style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.6 }}>{p.body.substring(0, 160)}{p.body.length > 160 ? '...' : ''}</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>By {p.members?.username} · {new Date(p.created_at).toLocaleDateString()}</div>
              </div>
            ))}
          </div>

          <div style={{ width: '220px', flexShrink: 0 }}>
            <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: faction.color ? `${faction.color}11` : 'transparent' }}>
                <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)' }}>{faction.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>[{faction.tag}]</div>
              </div>
              {faction.description && <div style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--muted)', lineHeight: 1.5, borderBottom: '1px solid var(--border)' }}>{faction.description}</div>}
              <div style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--muted)' }}>
                <div><strong style={{ color: 'var(--text)' }}>Ruler</strong> {ruler?.title || 'None'}</div>
                {ruler?.members?.username && <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>{ruler.members.username}</div>}
              </div>
              <div style={{ padding: '10px 16px', fontSize: '13px' }}>
                <div style={{ color: 'var(--muted)' }}><strong style={{ color: 'var(--text)' }}>Pages</strong> {pages.length}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
