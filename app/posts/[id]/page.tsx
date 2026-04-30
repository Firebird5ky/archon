// @ts-nocheck
'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

const TIER_LIMITS = {
  free:   { chars: 2000, label: 'Free',   color: '#9aa0a6' },
  bronze: { chars: 4000, label: 'Bronze', color: '#cd7f32' },
  silver: { chars: 8000, label: 'Silver', color: '#aaa9ad' },
  gold:   { chars: 16000,label: 'Gold',   color: '#ffd700' },
}

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (s < 60) return s + 's ago'
  if (s < 3600) return Math.floor(s/60) + 'm ago'
  if (s < 86400) return Math.floor(s/3600) + 'h ago'
  return Math.floor(s/86400) + 'd ago'
}

function renderBody(text) {
  if (!text) return null
  const lines = text.split('\n')
  const elements = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // YouTube
    const ytMatch = line.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/)
    if (ytMatch) {
      elements.push(
        <div key={i} style={{ marginBottom: '12px', borderRadius: '8px', overflow: 'hidden', maxWidth: '560px' }}>
          <iframe
            width="560" height="315"
            src={'https://www.youtube.com/embed/' + ytMatch[1]}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ maxWidth: '100%' }}
          />
        </div>
      )
      continue
    }

    // Vimeo
    const vimeoMatch = line.match(/(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(\d+)/)
    if (vimeoMatch) {
      elements.push(
        <div key={i} style={{ marginBottom: '12px', borderRadius: '8px', overflow: 'hidden', maxWidth: '560px' }}>
          <iframe
            width="560" height="315"
            src={'https://player.vimeo.com/video/' + vimeoMatch[1]}
            frameBorder="0"
            allowFullScreen
            style={{ maxWidth: '100%' }}
          />
        </div>
      )
      continue
    }

    // Direct video
    if (line.match(/^https?:\/\/.+\.mp4(\?.*)?$/i)) {
      elements.push(
        <video key={i} controls style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '8px', marginBottom: '12px' }}>
          <source src={line} type="video/mp4" />
        </video>
      )
      continue
    }

    // Image
    if (line.match(/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i)) {
      elements.push(
        <div key={i} style={{ marginBottom: '12px' }}>
          <img src={line} alt="" style={{ maxWidth: '100%', maxHeight: '500px', borderRadius: '8px', display: 'block', objectFit: 'contain' }} onError={e => { e.target.style.display = 'none' }} />
        </div>
      )
      continue
    }

    // Plain URL
    if (line.match(/^https?:\/\//)) {
      elements.push(
        <div key={i} style={{ marginBottom: '4px' }}>
          <a href={line} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--link)', wordBreak: 'break-all' }}>{line}</a>
        </div>
      )
      continue
    }

    // Regular text line
    elements.push(
      <p key={i} style={{ marginBottom: line === '' ? '8px' : '4px', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{line}</p>
    )
  }

  return <div style={{ fontSize: '15px', color: 'var(--text)' }}>{elements}</div>
}

function CommentNode({ comment, allComments, member, onReply, onDelete, depth = 0 }) {
  const [showReply, setShowReply] = useState(false)
  const [replyBody, setReplyBody] = useState('')
  const children = allComments.filter(c => c.parent_id === comment.id)
  const isAuthor = member && String(comment.author_id) === String(member.id)
  const isDeleted = comment.is_deleted

  return (
    <div style={{ marginLeft: depth > 0 ? '20px' : '0', borderLeft: depth > 0 ? '2px solid var(--border)' : 'none', paddingLeft: depth > 0 ? '12px' : '0', marginTop: '12px' }}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
        <Link href={'/members/' + comment.members?.username} style={{ fontSize: '13px', fontWeight: 600, color: '#4285f4', textDecoration: 'none' }}>
          {comment.members?.username || '[deleted]'}
        </Link>
        <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{timeAgo(comment.created_at)}</span>
        {isAuthor && !isDeleted && (
          <button onClick={() => onDelete(comment.id)} style={{ fontSize: '11px', color: '#ea4335', background: 'none', border: 'none', cursor: 'pointer', marginLeft: '4px' }}>delete</button>
        )}
      </div>

      <div style={{ fontSize: '14px', color: isDeleted ? 'var(--muted)' : 'var(--text)', lineHeight: 1.6, fontStyle: isDeleted ? 'italic' : 'normal', marginBottom: '6px' }}>
        {isDeleted ? '[deleted]' : comment.body}
      </div>

      {member && !isDeleted && (
        <button onClick={() => setShowReply(!showReply)} style={{ fontSize: '12px', color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: '8px' }}>
          {showReply ? 'cancel' : 'reply'}
        </button>
      )}

      {showReply && (
        <div style={{ marginBottom: '8px' }}>
          <textarea
            value={replyBody}
            onChange={e => setReplyBody(e.target.value)}
            placeholder="Write a reply..."
            style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '13px', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'arial, sans-serif', resize: 'vertical', minHeight: '60px', marginBottom: '6px' }}
          />
          <button onClick={() => { onReply(comment.id, replyBody); setReplyBody(''); setShowReply(false) }}
            style={{ padding: '5px 12px', background: '#4285f4', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>
            Reply
          </button>
        </div>
      )}

      {children.map(child => (
        <CommentNode key={child.id} comment={child} allComments={allComments} member={member} onReply={onReply} onDelete={onDelete} depth={depth + 1} />
      ))}
    </div>
  )
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
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [commentMsg, setCommentMsg] = useState('')
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const id = params.id

  useEffect(() => { load() }, [id])

  async function load() {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      const username = session.user.user_metadata?.full_name || session.user.user_metadata?.name
      const { data: m } = await supabase.from('members').select('*').eq('username', username).single()
      if (m) setMember(m)
    }
    const local = typeof window !== 'undefined' ? localStorage.getItem('archon-member') : null
    if (local && !member) setMember(JSON.parse(local))

    const { data: p } = await supabase.from('posts').select('*, members(username, tier), factions(name)').eq('id', id).single()
    if (p) {
      setPost(p)
      setEditTitle(p.title || '')
      setEditBody(p.body)
      setEditVisibility(p.visibility || 'free')
    }
    loadComments()
    setLoading(false)
  }

  async function loadComments() {
    const { data } = await supabase.from('comments').select('*, members(username)').eq('post_id', id).order('created_at')
    setComments(data || [])
  }

  async function submitComment(parentId = null, body = newComment) {
    if (!member) { setCommentMsg('Login to comment'); return }
    if (!body.trim()) { setCommentMsg('Comment cannot be empty'); return }
    const { error } = await supabase.from('comments').insert({
      post_id: parseInt(id),
      author_id: member.id,
      parent_id: parentId,
      body: body.trim(),
    })
    if (error) { setCommentMsg(error.message); return }
    setNewComment('')
    setCommentMsg('')
    loadComments()
  }

  async function deleteComment(commentId) {
    if (!confirm('Delete this comment?')) return
    await supabase.from('comments').update({ is_deleted: true, body: '' }).eq('id', commentId)
    loadComments()
  }

  async function saveEdit() {
    if (!editBody.trim()) { setMsg('Post cannot be empty'); return }
    const { error } = await supabase.from('posts').update({ title: editTitle, body: editBody, visibility: editVisibility, updated_at: new Date().toISOString() }).eq('id', id)
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
  if (!post) return <div style={{ padding: '40px', fontFamily: 'arial, sans-serif' }}>Post not found. <Link href="/dashboard" style={{ color: '#4285f4' }}>Back</Link></div>

  const isAuthor = member && String(post.author_id) === String(member.id)
  const tierInfo = TIER_LIMITS[post.visibility] || TIER_LIMITS.free
  const memberTier = TIER_LIMITS[member?.tier] || TIER_LIMITS.free
  const topComments = comments.filter(c => !c.parent_id)

  const inp = { padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '14px', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'arial, sans-serif', width: '100%' }
  const btn = (bg='#4285f4') => ({ padding: '6px 14px', background: bg, color: '#fff', border: 'none', borderRadius: '4px', fontSize: '13px', cursor: 'pointer', fontFamily: 'arial, sans-serif' })

  return (
    <div style={{ fontFamily: 'arial, sans-serif', minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 24px', borderBottom: '1px solid var(--border)' }}>
        <Link href="/dashboard" style={{ fontSize: '22px', fontWeight: 700, background: 'linear-gradient(180deg,#1a1a1a 0%,#c8960c 75%,#ffd700 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', textDecoration: 'none' }}>ARCHON</Link>
        <span style={{ color: 'var(--muted)' }}>›</span>
        <span style={{ fontSize: '14px', color: 'var(--muted)' }}>posts</span>
        <span style={{ color: 'var(--muted)' }}>›</span>
        <span style={{ fontSize: '14px', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}>{post.title || 'Untitled'}</span>
      </div>

      <div style={{ maxWidth: '760px', padding: '32px 24px' }}>
        <div style={{ fontSize: '12px', color: '#188038', marginBottom: '4px' }}>posts › {post.members?.username} › {post.id}</div>

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
              <button onClick={() => setEditing(false)} style={{ ...btn('transparent'), color: 'var(--muted)', border: '1px solid var(--border)' }}>Cancel</button>
            </div>
            {msg && <p style={{ fontSize: '13px', color: '#ea4335' }}>{msg}</p>}
          </div>
        ) : (
          <>
            {post.title && <h1 style={{ fontSize: '28px', fontWeight: 600, color: 'var(--text)', marginBottom: '12px', lineHeight: 1.3 }}>{post.title}</h1>}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap' }}>
              <Link href={'/members/' + post.members?.username} style={{ fontSize: '13px', color: '#4285f4', textDecoration: 'none', fontWeight: 600 }}>{post.members?.username}</Link>
              {post.factions?.name && <Link href={'/f/' + post.factions.name} style={{ fontSize: '13px', color: '#4285f4', textDecoration: 'none' }}>{post.factions.name}</Link>}
              <span style={{ fontSize: '11px', padding: '2px 8px', border: '1px solid ' + tierInfo.color, color: tierInfo.color, borderRadius: '12px' }}>{tierInfo.label}</span>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{timeAgo(post.created_at)}</span>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{comments.filter(c => !c.is_deleted).length} comments</span>
              {isAuthor && (
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                  <button onClick={() => setEditing(true)} style={btn()}>Edit</button>
                  <button onClick={deletePost} style={btn('#ea4335')}>Delete</button>
                </div>
              )}
            </div>
            <div style={{ marginBottom: '40px' }}>{renderBody(post.body)}</div>
          </>
        )}

        {/* Comments section */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', marginBottom: '20px' }}>
            {comments.filter(c => !c.is_deleted).length} Comments
          </h2>

          {member ? (
            <div style={{ marginBottom: '24px' }}>
              <textarea
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '14px', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'arial, sans-serif', resize: 'vertical', minHeight: '80px', marginBottom: '8px' }}
              />
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button onClick={() => submitComment(null)} style={btn()}>Comment</button>
                {commentMsg && <span style={{ fontSize: '13px', color: '#ea4335' }}>{commentMsg}</span>}
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: '24px', padding: '12px 16px', border: '1px solid var(--border)', borderRadius: '6px' }}>
              <p style={{ fontSize: '13px', color: 'var(--muted)' }}>
                <Link href="/login" style={{ color: '#4285f4' }}>Login</Link> to leave a comment.
              </p>
            </div>
          )}

          {topComments.length === 0 && (
            <p style={{ color: 'var(--muted)', fontSize: '14px' }}>No comments yet. Be the first.</p>
          )}

          {topComments.map(comment => (
            <CommentNode
              key={comment.id}
              comment={comment}
              allComments={comments}
              member={member}
              onReply={(parentId, body) => submitComment(parentId, body)}
              onDelete={deleteComment}
              depth={0}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
