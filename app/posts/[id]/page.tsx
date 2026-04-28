// @ts-nocheck
'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

const TIER_LIMITS = {
  free:   { posts: 3,  chars: 2000,  label: 'Free',   color: '#9aa0a6' },
  bronze: { posts: 6,  chars: 4000,  label: 'Bronze',  color: '#cd7f32' },
  silver: { posts: 12, chars: 8000,  label: 'Silver',  color: '#aaa9ad' },
  gold:   { posts: 999,chars: 16000, label: 'Gold',    color: '#ffd700' },
}

export default function PostPage() {
  const [post, setPost] = useState(null)
  const [member, setMember] = useState(null)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editBody, setEditBody] = useState('')
  const [editVisibility, setEditVisibility] = useState('free')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const id = params.id

  useEffect(() => { load() }, [id])

  async function load() {
    setLoading(true)
    // Get current member
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      const username = session.user.user_metadata?.full_name || session.user.user_metadata?.name
      const { data: m } = await supabase.from('members').select('*').eq('username', username).single()
      if (m) setMember(m)
    }
    const local = localStorage.getItem('archon-member')
    if (local && !member) setMember(JSON.parse(local))

    // Get post
    const { data: p } = await supabase.from('posts').select('*, members(username, tier), factions(name)').eq('id', id).single()
    if (p) {
      setPost(p)
      setEditTitle(p.title || '')
      setEditBody(p.body)
      setEditVisibility(p.visibility || 'free')
    }
    setLoading(false)
  }

  async function saveEdit() {
    if (!editBody.trim()) { setMsg('Post cannot be empty'); return }
    const limits = TIER_LIMITS[member?.tier] || TIER_LIMITS.free
    if (editBody.length > limits.chars) { setMsg('Exceeds character limit'); return }
    const { error } = await supabase.from('posts').update({
      title: editTitle,
      body: editBody,
      visibility: editVisibility,
      updated_at: new Date().toISOString()
    }).eq('id', id)
    if (error) { setMsg(error.message); return }
    setEditing(false)
    load()
  }

  async function deletePost() {
    if (!confirm('Delete this post?')) return
    await supabase.from('posts').delete().eq('id', id)
    router.push('/dashboard')
  }

  if (loading) return <div style={{ padding: '40px', fontFamily: 'arial, sans-serif', color: 'var(--muted)' }}>Loading...</div>
  if (!post) return <div style={{ padding: '40px', fontFamily: 'arial, sans-serif', color: 'var(--text)' }}>Post not found. <Link href="/dashboard" style={{ color: '#4285f4' }}>Back</Link></div>

  const isAuthor = member && String(post.author_id) === String(member.id)
  const tierInfo = TIER_LIMITS[post.visibility] || TIER_LIMITS.free
  const memberTier = TIER_LIMITS[member?.tier] || TIER_LIMITS.free
  const inp = { padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '14px', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'arial, sans-serif', width: '100%' }
  const btn = (bg='#4285f4') => ({ padding: '6px 14px', background: bg, color: '#fff', border: 'none', borderRadius: '4px', fontSize: '13px', cursor: 'pointer', fontFamily: 'arial, sans-serif' })

  return (
    <div style={{ fontFamily: 'arial, sans-serif', minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 24px', borderBottom: '1px solid var(--border)' }}>
        <Link href="/dashboard" style={{ fontSize: '22px', fontWeight: 700, background: 'linear-gradient(180deg,#1a1a1a 0%,#c8960c 75%,#ffd700 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', textDecoration: 'none' }}>ARCHON</Link>
        <span style={{ color: 'var(--muted)', fontSize: '14px' }}>›</span>
        <span style={{ fontSize: '14px', color: 'var(--muted)' }}>posts</span>
        <span style={{ color: 'var(--muted)', fontSize: '14px' }}>›</span>
        <span style={{ fontSize: '14px', color: 'var(--text)' }}>{post.title || 'Untitled'}</span>
      </div>

      <div style={{ maxWidth: '760px', padding: '32px 24px' }}>
        {/* Path */}
        <div style={{ fontSize: '12px', color: '#188038', marginBottom: '4px' }}>
          posts › {post.members?.username} › {post.id}
        </div>

        {editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input style={inp} placeholder="Title (optional)" value={editTitle} onChange={e => setEditTitle(e.target.value)} />
            <textarea value={editBody} onChange={e => setEditBody(e.target.value)} style={{ ...inp, minHeight: '300px', resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: editBody.length > memberTier.chars ? '#ea4335' : 'var(--muted)' }}>{editBody.length}/{memberTier.chars}</span>
              <select value={editVisibility} onChange={e => setEditVisibility(e.target.value)} style={{ padding: '4px 8px', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '12px', background: 'var(--bg)', color: 'var(--text)' }}>
                {['free','bronze','silver','gold'].slice(0, ['free','bronze','silver','gold'].indexOf(member?.tier) + 1).map(t => (
                  <option key={t} value={t}>{TIER_LIMITS[t].label} visible</option>
                ))}
              </select>
              <button onClick={saveEdit} style={btn()}>Save</button>
              <button onClick={() => setEditing(false)} style={{ ...btn('none'), color: 'var(--muted)', border: '1px solid var(--border)' }}>Cancel</button>
            </div>
            {msg && <p style={{ fontSize: '13px', color: '#ea4335' }}>{msg}</p>}
          </div>
        ) : (
          <>
            {post.title && <h1 style={{ fontSize: '28px', fontWeight: 600, color: 'var(--text)', marginBottom: '12px', lineHeight: 1.3 }}>{post.title}</h1>}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', color: 'var(--muted)' }}>By {post.members?.username}</span>
              {post.factions?.name && <Link href={'/f/' + post.factions.name} style={{ fontSize: '13px', color: '#4285f4', textDecoration: 'none' }}>{post.factions.name}</Link>}
              <span style={{ fontSize: '11px', padding: '2px 8px', border: '1px solid ' + tierInfo.color, color: tierInfo.color, borderRadius: '12px' }}>{tierInfo.label}</span>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{new Date(post.created_at).toLocaleDateString()}</span>
              {post.updated_at !== post.created_at && <span style={{ fontSize: '12px', color: 'var(--muted)' }}>(edited {new Date(post.updated_at).toLocaleDateString()})</span>}
              {isAuthor && (
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                  <button onClick={() => setEditing(true)} style={btn()}>Edit</button>
                  <button onClick={deletePost} style={btn('#ea4335')}>Delete</button>
                </div>
              )}
            </div>
            <div style={{ fontSize: '15px', color: 'var(--text)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{post.body}</div>
          </>
        )}
      </div>
    </div>
  )
}
