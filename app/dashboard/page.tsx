// @ts-nocheck
'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const TIER_LIMITS = {
  free:   { posts: 3,  chars: 2000,  label: 'Free',   color: '#9aa0a6' },
  bronze: { posts: 6,  chars: 4000,  label: 'Bronze',  color: '#cd7f32' },
  silver: { posts: 12, chars: 8000,  label: 'Silver',  color: '#aaa9ad' },
  gold:   { posts: 999,chars: 16000, label: 'Gold',    color: '#ffd700' },
}

const TIER_ORDER = ['free', 'bronze', 'silver', 'gold']

export default function Dashboard() {
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState('all')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [member, setMember] = useState(null)
  const [factions, setFactions] = useState([])
  const [showTiers, setShowTiers] = useState(false)
  const [showPanel, setShowPanel] = useState(false)
  const [panelTab, setPanelTab] = useState('login')
  const [panelUser, setPanelUser] = useState('')
  const [panelPass, setPanelPass] = useState('')
  const [panelMsg, setPanelMsg] = useState('')
  const [showGuide, setShowGuide] = useState(false)
  const [showPost, setShowPost] = useState(false)
  const [postBody, setPostBody] = useState('')
  const [postTitle, setPostTitle] = useState('')
  const [postVisibility, setPostVisibility] = useState('free')
  const [postFaction, setPostFaction] = useState('')
  const [postMsg, setPostMsg] = useState('')
  const [editPost, setEditPost] = useState(null)
  const [posts, setPosts] = useState([])
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    init()
  }, [])

  useEffect(() => {
    search(query, tab)
  }, [query, tab])

  async function init() {
    // Try Discord session first
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      const username = session.user.user_metadata?.full_name || session.user.user_metadata?.name
      if (username) {
        const { data: m } = await supabase.from('members').select('*').eq('username', username).single()
        if (m) setMember(m)
      }
    }
    // Try local session
    const localMember = localStorage.getItem('archon-member')
    if (localMember && !member) {
      setMember(JSON.parse(localMember))
    }
    const { data: f } = await supabase.from('factions').select('*').eq('is_active', true).order('name')
    setFactions(f || [])
    loadPosts()
  }

  async function loadPosts() {
    const { data } = await supabase.from('posts').select('*, members(username), factions(name)').order('created_at', { ascending: false }).limit(50)
    setPosts(data || [])
  }

  async function search(q, t) {
    setLoading(true)
    const res = []
    if (t === 'all' || t === 'factions') {
      let fq = supabase.from('factions').select('*').eq('is_active', true)
      if (q) fq = fq.ilike('name', '%' + q + '%')
      const { data } = await fq.limit(8)
      data?.forEach(f => res.push({ type: 'faction', title: f.name + ' — Faction', path: ['factions', f.name], snippet: f.description || '[' + f.tag + ']', tags: [f.tag], href: '/f/' + f.name }))
    }
    if (t === 'all' || t === 'members') {
      let mq = supabase.from('members').select('*').eq('is_banned', false)
      if (q) mq = mq.ilike('username', '%' + q + '%')
      const { data } = await mq.limit(8)
      data?.forEach(m => res.push({ type: 'member', title: (m.display_name || m.username) + ' — Member', path: ['members', m.username], snippet: 'Tier: ' + m.tier + '. XP: ' + m.total_xp + '.', tags: [m.tier], href: '/members/' + m.username }))
    }
    if (t === 'all' || t === 'pages') {
      let pq = supabase.from('pages').select('*, factions(name)').eq('is_published', true)
      if (q) pq = pq.ilike('title', '%' + q + '%')
      const { data } = await pq.limit(8)
      data?.forEach(p => res.push({ type: 'page', title: p.title, path: ['factions', p.factions?.name, p.slug].filter(Boolean), snippet: p.body.substring(0, 160), tags: [p.factions?.name].filter(Boolean), href: '/f/' + p.factions?.name + '/' + p.slug }))
    }
    setResults(res)
    setLoading(false)
  }

  async function handleLogin() {
    setPanelMsg('')
    if (!panelUser || !panelPass) { setPanelMsg('Fill in all fields'); return }
    const { data: m } = await supabase.from('members').select('*').eq('username', panelUser).single()
    if (!m) { setPanelMsg('Account not found'); return }
    if (!m.password_hash) { setPanelMsg('This account uses Discord login'); return }
    // Simple check — compare hashed password
    const res = await fetch('/api/auth/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: panelPass, hash: m.password_hash }) })
    const { match } = await res.json()
    if (!match) { setPanelMsg('Wrong password'); return }
    setMember(m)
    localStorage.setItem('archon-member', JSON.stringify(m))
    setShowPanel(false)
    setPanelUser(''); setPanelPass('')
  }

  async function handleSignup() {
    setPanelMsg('')
    if (!panelUser || !panelPass) { setPanelMsg('Fill in all fields'); return }
    if (panelUser.length < 3) { setPanelMsg('Username must be 3+ characters'); return }
    if (panelPass.length < 6) { setPanelMsg('Password must be 6+ characters'); return }
    const { data: existing } = await supabase.from('members').select('id').eq('username', panelUser).single()
    if (existing) { setPanelMsg('Username taken'); return }
    const res = await fetch('/api/auth/hash', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: panelPass }) })
    const { hash } = await res.json()
    const fakeId = BigInt(Date.now())
    const { data: m, error } = await supabase.from('members').insert({ id: fakeId, username: panelUser, password_hash: hash, auth_type: 'password', tier: 'free', role: 'member', total_xp: 0 }).select().single()
    if (error) { setPanelMsg(error.message); return }
    setMember(m)
    localStorage.setItem('archon-member', JSON.stringify(m))
    setShowPanel(false)
    setPanelUser(''); setPanelPass('')
  }

  function handleSignOut() {
    supabase.auth.signOut()
    localStorage.removeItem('archon-member')
    setMember(null)
  }

  async function submitPost() {
    if (!member) { setPostMsg('Login to post'); return }
    const limits = TIER_LIMITS[member.tier] || TIER_LIMITS.free
    if (postBody.length > limits.chars) { setPostMsg('Post exceeds character limit'); return }
    if (!postBody.trim()) { setPostMsg('Post cannot be empty'); return }

    if (editPost) {
      const { error } = await supabase.from('posts').update({ title: postTitle, body: postBody, visibility: postVisibility, updated_at: new Date().toISOString() }).eq('id', editPost.id)
      if (error) { setPostMsg(error.message); return }
      setEditPost(null)
    } else {
      // Check weekly limit
      const weekNum = getWeekNumber()
      const yearNum = new Date().getFullYear()
      const { count } = await supabase.from('posts').select('*', { count: 'exact', head: true }).eq('author_id', member.id).eq('week_number', weekNum).eq('year_number', yearNum)
      if (limits.posts !== 999 && count >= limits.posts) { setPostMsg('Weekly post limit reached (' + limits.posts + '/week for ' + limits.label + ' tier)'); return }

      const factionId = postFaction ? parseInt(postFaction) : null
      const { error } = await supabase.from('posts').insert({
        author_id: member.id,
        faction_id: factionId,
        title: postTitle,
        body: postBody,
        visibility: postVisibility,
        week_number: weekNum,
        year_number: yearNum,
        char_limit: limits.chars,
      })
      if (error) { setPostMsg(error.message); return }
    }

    setPostBody(''); setPostTitle(''); setPostMsg(''); setShowPost(false)
    loadPosts()
  }

  function getWeekNumber() {
    const d = new Date()
    d.setHours(0,0,0,0)
    d.setDate(d.getDate() + 4 - (d.getDay() || 7))
    const yearStart = new Date(d.getFullYear(), 0, 1)
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
  }

  function startEdit(post) {
    setEditPost(post)
    setPostTitle(post.title || '')
    setPostBody(post.body)
    setPostVisibility(post.visibility || 'free')
    setPostFaction(post.faction_id || '')
    setShowPost(true)
  }

  async function deletePost(id) {
    if (!confirm('Delete this post?')) return
    await supabase.from('posts').delete().eq('id', id)
    loadPosts()
  }

  const tier = member ? (TIER_LIMITS[member.tier] || TIER_LIMITS.free) : TIER_LIMITS.free
  const isDeity = member?.role === 'deity'
  const visiblePosts = posts.filter(p => {
    const pTierIdx = TIER_ORDER.indexOf(p.visibility || 'free')
    const mTierIdx = member ? TIER_ORDER.indexOf(member.tier) : 0
    return pTierIdx <= mTierIdx
  })

  const inp = { padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '14px', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'arial, sans-serif', width: '100%' }
  const btn = (bg='#4285f4', sm=false) => ({ padding: sm ? '4px 10px' : '8px 16px', background: bg, color: '#fff', border: 'none', borderRadius: '4px', fontSize: sm ? '12px' : '13px', cursor: 'pointer', fontFamily: 'arial, sans-serif' })

  return (
    <div style={{ fontFamily: 'arial, sans-serif', minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 24px', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: '22px', fontWeight: 700, background: 'linear-gradient(180deg,#1a1a1a 0%,#c8960c 75%,#ffd700 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', flexShrink: 0 }}>ARCHON</span>
        <div style={{ flex: 1, maxWidth: '580px' }}>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search factions, members, pages..." style={{ ...inp, borderRadius: '24px', width: '100%' }} />
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
          {member ? (
            <>
              <button onClick={() => setShowTiers(!showTiers)} style={{ fontSize: '12px', padding: '3px 10px', border: '1px solid ' + tier.color, color: tier.color, background: 'none', borderRadius: '12px', cursor: 'pointer' }}>{tier.label}</button>
              {isDeity && <Link href="/admin" style={{ fontSize: '12px', padding: '4px 10px', background: '#ea4335', color: '#fff', borderRadius: '4px', textDecoration: 'none' }}>Admin</Link>}
              <span style={{ fontSize: '13px', color: 'var(--muted)' }}>{member.username}</span>
              <button onClick={handleSignOut} style={{ fontSize: '13px', color: '#4285f4', background: 'none', border: 'none', cursor: 'pointer' }}>Sign out</button>
            </>
          ) : (
            <>
              <button onClick={() => { setShowPanel(true); setPanelTab('login') }} style={btn()}>Login</button>
              <Link href="/login" style={{ fontSize: '13px', color: '#4285f4', textDecoration: 'none' }}>Discord</Link>
            </>
          )}
        </div>
      </div>

      {/* Tier panel */}
      {showTiers && (
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ maxWidth: '860px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            {Object.entries(TIER_LIMITS).map(([key, t]) => (
              <div key={key} style={{ border: '1px solid ' + (member?.tier === key ? t.color : 'var(--border)'), borderRadius: '8px', padding: '12px' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: t.color, marginBottom: '8px' }}>{t.label}</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '3px' }}>· {t.posts === 999 ? 'Unlimited' : t.posts} posts/week</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '3px' }}>· {t.chars.toLocaleString()} chars/post</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>· Unlimited edits</div>
                {member?.tier === key && <div style={{ fontSize: '11px', color: t.color, marginTop: '8px', fontWeight: 600 }}>YOUR TIER</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Side login panel */}
      {showPanel && (
        <div style={{ position: 'fixed', top: 0, right: 0, width: '320px', height: '100vh', background: 'var(--bg)', borderLeft: '1px solid var(--border)', zIndex: 100, padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text)' }}>{panelTab === 'login' ? 'Login' : 'Create Account'}</span>
            <button onClick={() => setShowPanel(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--muted)' }}>×</button>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setPanelTab('login')} style={{ ...btn(panelTab === 'login' ? '#4285f4' : 'var(--border)'), flex: 1, color: panelTab === 'login' ? '#fff' : 'var(--text)' }}>Login</button>
            <button onClick={() => setPanelTab('signup')} style={{ ...btn(panelTab === 'signup' ? '#4285f4' : 'var(--border)'), flex: 1, color: panelTab === 'signup' ? '#fff' : 'var(--text)' }}>Sign Up</button>
          </div>
          <input style={inp} placeholder="Username" value={panelUser} onChange={e => setPanelUser(e.target.value)} />
          <input style={inp} type="password" placeholder="Password" value={panelPass} onChange={e => setPanelPass(e.target.value)} onKeyDown={e => e.key === 'Enter' && (panelTab === 'login' ? handleLogin() : handleSignup())} />
          {panelMsg && <p style={{ fontSize: '13px', color: '#ea4335' }}>{panelMsg}</p>}
          <button onClick={panelTab === 'login' ? handleLogin : handleSignup} style={btn()}>
            {panelTab === 'login' ? 'Login' : 'Create Account'}
          </button>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
            <Link href="/login" style={{ ...btn('#5865F2'), display: 'block', textAlign: 'center', textDecoration: 'none' }}>Login with Discord</Link>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: 'auto' }}>You must be a member of the Discord server to create an account and post.</p>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', padding: '0 24px', borderBottom: '1px solid var(--border)' }}>
        {['all', 'factions', 'members', 'pages', 'posts'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '10px 16px', fontSize: '13px', background: 'none', border: 'none', borderBottom: tab === t ? '3px solid #4285f4' : '3px solid transparent', color: tab === t ? '#4285f4' : 'var(--muted)', cursor: 'pointer', textTransform: 'capitalize', fontFamily: 'arial, sans-serif' }}>{t}</button>
        ))}
      </div>

      <div style={{ display: 'flex', padding: '16px 24px', gap: '32px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Posts tab */}
          {tab === 'posts' && (
            <div>
              {member ? (
                <div style={{ marginBottom: '24px' }}>
                  {!showPost ? (
                    <button onClick={() => { setShowPost(true); setEditPost(null); setPostBody(''); setPostTitle('') }} style={btn()}>+ New Post</button>
                  ) : (
                    <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text)' }}>{editPost ? 'Edit Post' : 'New Post'}</span>
                        <button onClick={() => { setShowPost(false); setEditPost(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '18px' }}>×</button>
                      </div>
                      <input style={{ ...inp, marginBottom: '8px' }} placeholder="Title (optional)" value={postTitle} onChange={e => setPostTitle(e.target.value)} />
                      <textarea value={postBody} onChange={e => setPostBody(e.target.value)} placeholder="Write your post..." style={{ ...inp, minHeight: '120px', resize: 'vertical', marginBottom: '8px' }} />
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', color: postBody.length > tier.chars ? '#ea4335' : 'var(--muted)' }}>{postBody.length}/{tier.chars}</span>
                        <select value={postVisibility} onChange={e => setPostVisibility(e.target.value)} style={{ padding: '4px 8px', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '12px', background: 'var(--bg)', color: 'var(--text)' }}>
                          {TIER_ORDER.slice(0, TIER_ORDER.indexOf(member.tier) + 1).map(t => (
                            <option key={t} value={t}>{TIER_LIMITS[t].label} visible</option>
                          ))}
                        </select>
                        <select value={postFaction} onChange={e => setPostFaction(e.target.value)} style={{ padding: '4px 8px', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '12px', background: 'var(--bg)', color: 'var(--text)' }}>
                          <option value="">No faction</option>
                          {factions.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                        <button onClick={submitPost} style={btn()}>
                          {editPost ? 'Save' : 'Post'}
                        </button>
                      </div>
                      {postMsg && <p style={{ fontSize: '13px', color: '#ea4335' }}>{postMsg}</p>}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ marginBottom: '24px', padding: '16px', border: '1px solid var(--border)', borderRadius: '8px' }}>
                  <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '12px' }}>Login to create posts.</p>
                  <button onClick={() => setShowPanel(true)} style={btn()}>Login</button>
                </div>
              )}

              {visiblePosts.map(p => (
                <div key={p.id} style={{ marginBottom: '28px' }}>
                  <div style={{ fontSize: '12px', color: '#188038', marginBottom: '2px' }}>posts › {p.members?.username}{p.factions?.name ? ' › ' + p.factions.name : ''}</div>
                  <Link href={'/posts/' + p.id} style={{ fontSize: '18px', color: '#1a0dab', textDecoration: 'none', display: 'block', marginBottom: '4px' }}>
                    {p.title || 'Untitled post'}
                  </Link>
                  <div style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '6px' }}>
                    {p.body.substring(0, 160)}{p.body.length > 160 ? '...' : ''}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ fontSize: '11px', padding: '2px 8px', border: '1px solid var(--border)', borderRadius: '12px', color: TIER_LIMITS[p.visibility]?.color || 'var(--muted)' }}>{TIER_LIMITS[p.visibility]?.label}</span>
                    <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{new Date(p.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
              {visiblePosts.length === 0 && <p style={{ color: 'var(--muted)', fontSize: '14px' }}>No posts yet.</p>}
            </div>
          )}

          {/* Search results */}
          {tab !== 'posts' && (
            <>
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
                    {r.tags.map((tag, ti) => <span key={ti} style={{ fontSize: '11px', padding: '2px 8px', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--muted)' }}>{tag}</span>)}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Sidebar */}
        <div style={{ width: '240px', flexShrink: 0 }}>
          <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', marginBottom: '16px' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text)' }}>Network</div>
            </div>
            <div style={{ padding: '10px 16px', fontSize: '13px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--muted)' }}>Factions</span><span style={{ color: 'var(--text)', fontWeight: 500 }}>{factions.length}</span>
            </div>
            <div style={{ padding: '10px 16px', fontSize: '13px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--muted)' }}>Your tier</span>
              <span style={{ color: tier.color, fontWeight: 500 }}>{member ? tier.label : 'Guest'}</span>
            </div>
          </div>
          {!member && (
            <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px' }}>
              <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '10px' }}>Login to post and join factions.</p>
              <button onClick={() => setShowPanel(true)} style={{ ...btn(), width: '100%' }}>Login / Sign Up</button>
            </div>
          )}
          <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', marginBottom: '16px' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => setShowGuide(!showGuide)}>
              <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }}>How ARCHON Works</span>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{showGuide ? '▲' : '▼'}</span>
            </div>
            {showGuide && (
              <div style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--muted)', lineHeight: 1.7 }}>
                <p style={{ marginBottom: '10px', color: 'var(--text)', fontWeight: 500 }}>Welcome to ARCHON</p>
                <p style={{ marginBottom: '8px' }}>ARCHON is a faction-based network. Join or watch factions compete, collaborate, and build their own spaces.</p>
                <p style={{ marginBottom: '10px', color: 'var(--text)', fontWeight: 500 }}>Tiers</p>
                <div style={{ marginBottom: '6px' }}><span style={{ color: '#9aa0a6', fontWeight: 600 }}>Free</span> — Browse all public content. 3 posts/week, 2000 chars each.</div>
                <div style={{ marginBottom: '6px' }}><span style={{ color: '#cd7f32', fontWeight: 600 }}>Bronze</span> — 6 posts/week, 4000 chars. Join up to 2 factions.</div>
                <div style={{ marginBottom: '6px' }}><span style={{ color: '#aaa9ad', fontWeight: 600 }}>Silver</span> — 12 posts/week, 8000 chars. Priority build requests.</div>
                <div style={{ marginBottom: '10px' }}><span style={{ color: '#ffd700', fontWeight: 600 }}>Gold</span> — Unlimited posts, 16000 chars. Full access.</div>
                <p style={{ marginBottom: '10px', color: 'var(--text)', fontWeight: 500 }}>Posting</p>
                <p style={{ marginBottom: '8px' }}>Go to the Posts tab to create posts. You choose who can see each post — up to your own tier level. Your posts can be edited unlimited times.</p>
                <p style={{ marginBottom: '10px', color: 'var(--text)', fontWeight: 500 }}>Factions</p>
                <p style={{ marginBottom: '8px' }}>Factions are groups led by Rulers. Each faction has its own space with pages and announcements. Click any faction to explore it.</p>
                <p style={{ marginBottom: '10px', color: 'var(--text)', fontWeight: 500 }}>Getting a Tier</p>
                <p>Tiers are assigned by the admin. Contact a Ruler or Deity in the Discord server to request an upgrade.</p>
              </div>
            )}
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
