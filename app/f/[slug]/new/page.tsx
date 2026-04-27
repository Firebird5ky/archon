'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

export default function NewPageEditor() {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [pinned, setPinned] = useState(false)
  const [msg, setMsg] = useState('')
  const [authorized, setAuthorized] = useState(false)
  const [faction, setFaction] = useState<any>(null)
  const [memberId, setMemberId] = useState<any>(null)
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const discordId = BigInt(user.user_metadata.provider_id)
      setMemberId(discordId)

      const { data: f } = await supabase.from('factions').select('*, rulers(member_id)').eq('name', decodeURIComponent(slug)).single()
      if (!f) { router.push('/dashboard'); return }
      setFaction(f)

      const { data: m } = await supabase.from('members').select('role').eq('id', discordId).single()
      const rulerIds = f.rulers?.map((r: any) => r.member_id.toString()) || []
      if (rulerIds.includes(discordId.toString()) || m?.role === 'deity') {
        setAuthorized(true)
      }
    }
    check()
  }, [])

  async function publish() {
    if (!title || !body) { setMsg('Title and content required'); return }
    const pageSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    const { error } = await supabase.from('pages').insert({
      faction_id: faction.id,
      author_id: memberId,
      title,
      slug: pageSlug,
      body,
      is_published: true,
      is_pinned: pinned,
    })
    if (error) { setMsg(error.message); return }
    router.push(`/f/${slug}`)
  }

  async function saveDraft() {
    if (!title) { setMsg('Title required'); return }
    const pageSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    const { error } = await supabase.from('pages').insert({
      faction_id: faction.id,
      author_id: memberId,
      title,
      slug: pageSlug,
      body,
      is_published: false,
      is_pinned: false,
    })
    if (error) { setMsg(error.message); return }
    setMsg('Saved as draft.')
  }

  if (!authorized) return <div style={{ padding: '40px', fontFamily: 'arial, sans-serif', color: 'var(--text)' }}>Not authorized.</div>

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'arial, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 24px', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: '20px', fontWeight: 700, background: 'linear-gradient(180deg,#1a1a1a 0%,#c8960c 75%,#ffd700 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>ARCHON</span>
        <span style={{ color: 'var(--muted)' }}>›</span>
        <span style={{ color: 'var(--muted)', fontSize: '14px' }}>{faction?.name}</span>
        <span style={{ color: 'var(--muted)' }}>›</span>
        <span style={{ fontSize: '14px', color: 'var(--text)' }}>New Page</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <button onClick={saveDraft} style={{ padding: '6px 14px', background: 'none', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '4px', fontSize: '13px', cursor: 'pointer' }}>Save Draft</button>
          <button onClick={publish} style={{ padding: '6px 14px', background: '#4285f4', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '13px', cursor: 'pointer' }}>Publish</button>
        </div>
      </div>

      <div style={{ maxWidth: '760px', padding: '32px 24px' }}>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Page title"
          style={{ width: '100%', fontSize: '28px', fontWeight: 600, border: 'none', outline: 'none', background: 'transparent', color: 'var(--text)', fontFamily: 'arial, sans-serif', marginBottom: '16px' }}
        />

        <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '16px' }}>
          URL: factions › {slug} › {title ? title.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'page-title'}
        </div>

        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Write your page content here..."
          style={{ width: '100%', minHeight: '400px', fontSize: '15px', lineHeight: 1.8, border: '1px solid var(--border)', borderRadius: '4px', padding: '16px', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'arial, sans-serif', resize: 'vertical', outline: 'none' }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
          <input type="checkbox" id="pinned" checked={pinned} onChange={e => setPinned(e.target.checked)} />
          <label htmlFor="pinned" style={{ fontSize: '13px', color: 'var(--muted)', cursor: 'pointer' }}>Pin this page to the top</label>
        </div>

        {msg && <p style={{ fontSize: '13px', color: '#ea4335', marginTop: '12px' }}>{msg}</p>}
      </div>
    </div>
  )
}
