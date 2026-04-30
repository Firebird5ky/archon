// @ts-nocheck
'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const CATEGORIES = ['Bug Report', 'Tier Upgrade', 'Appeal', 'General Support']
const STATUS_COLORS = { open: '#4285f4', 'in-progress': '#fbbc05', resolved: '#34a853', closed: '#9aa0a6' }

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return Math.floor(s/60) + 'm ago'
  if (s < 86400) return Math.floor(s/3600) + 'h ago'
  return Math.floor(s/86400) + 'd ago'
}

export default function TicketsPage() {
  const [member, setMember] = useState(null)
  const [ticket, setTicket] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [category, setCategory] = useState('General Support')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [reply, setReply] = useState('')
  const [msg, setMsg] = useState('')
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    let m = null
    if (session?.user) {
      const username = session.user.user_metadata?.full_name || session.user.user_metadata?.name
      const { data } = await supabase.from('members').select('*').eq('username', username).single()
      m = data
    }
    const local = typeof window !== 'undefined' ? localStorage.getItem('archon-member') : null
    if (!m && local) m = JSON.parse(local)
    if (!m) { router.push('/login'); return }
    setMember(m)

    const { data: t } = await supabase.from('tickets').select('*').eq('member_id', m.id).eq('archived', false).order('created_at', { ascending: false }).limit(1).single()
    setTicket(t || null)

    if (t) {
      const { data: msgs } = await supabase.from('ticket_messages').select('*').eq('ticket_id', t.id).order('created_at')
      setMessages(msgs || [])
    }
    setLoading(false)
  }

  async function submitTicket() {
    if (!title.trim() || !body.trim()) { setMsg('Fill in all fields'); return }
    if (ticket && ticket.status !== 'resolved' && ticket.status !== 'closed') {
      setMsg('You already have an open ticket.'); return
    }
    const { data: t, error } = await supabase.from('tickets').insert({
      member_id: member.id, category, title: title.trim(), body: body.trim(), status: 'open',
    }).select().single()
    if (error) { setMsg(error.message); return }
    // Add opening message
    await supabase.from('ticket_messages').insert({
      ticket_id: t.id, author_id: member.id, author_name: member.username, is_admin: false, body: body.trim()
    })
    setTitle(''); setBody(''); setShowForm(false); setMsg('')
    load()
  }

  async function archiveTicket() {
    if (!confirm('Archive this ticket? You can then open a new one.')) return
    await supabase.from('tickets').update({ archived: true }).eq('id', ticket.id)
    setTicket(null)
    setMessages([])
  }

  async function sendReply() {
    if (!reply.trim()) return
    await supabase.from('ticket_messages').insert({
      ticket_id: ticket.id, author_id: member.id, author_name: member.username, is_admin: false, body: reply.trim()
    })
    setReply('')
    load()
  }

  const canOpenNew = !ticket || ticket.status === 'resolved' || ticket.status === 'closed'
  const canReply = ticket && ticket.status !== 'closed'
  const inp = { padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '14px', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'arial, sans-serif', width: '100%' }
  const btn = (bg='#4285f4') => ({ padding: '8px 16px', background: bg, color: '#fff', border: 'none', borderRadius: '4px', fontSize: '13px', cursor: 'pointer', fontFamily: 'arial, sans-serif' })

  if (loading) return <div style={{ padding: '40px', fontFamily: 'arial, sans-serif', color: 'var(--muted)' }}>Loading...</div>

  return (
    <div style={{ fontFamily: 'arial, sans-serif', minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 24px', borderBottom: '1px solid var(--border)' }}>
        <Link href="/dashboard" style={{ fontSize: '22px', fontWeight: 700, background: 'linear-gradient(180deg,#1a1a1a 0%,#c8960c 75%,#ffd700 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', textDecoration: 'none' }}>ARCHON</Link>
        <span style={{ color: 'var(--muted)' }}>›</span>
        <span style={{ fontSize: '14px', color: 'var(--text)' }}>Support Ticket</span>
      </div>

      <div style={{ maxWidth: '680px', padding: '32px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--text)' }}>My Ticket</h1>
          {canOpenNew && !showForm && (
            <button onClick={() => setShowForm(true)} style={btn()}>+ New Ticket</button>
          )}
        </div>

        {showForm && (
          <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '20px', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', marginBottom: '16px' }}>New Ticket</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <select value={category} onChange={e => setCategory(e.target.value)} style={inp}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input style={inp} placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
              <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Describe your issue in detail..." style={{ ...inp, minHeight: '120px', resize: 'vertical' }} />
              {msg && <p style={{ fontSize: '13px', color: '#ea4335' }}>{msg}</p>}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={submitTicket} style={btn()}>Submit</button>
                <button onClick={() => { setShowForm(false); setMsg('') }} style={{ ...btn('transparent'), color: 'var(--muted)', border: '1px solid var(--border)' }}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {!ticket && !showForm && (
          <div style={{ padding: '40px', textAlign: 'center', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--muted)' }}>
            <p style={{ marginBottom: '16px' }}>No active ticket.</p>
            <button onClick={() => setShowForm(true)} style={btn()}>Open a Ticket</button>
          </div>
        )}

        {ticket && (
          <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)' }}>{ticket.title}</span>
                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: STATUS_COLORS[ticket.status] + '22', color: STATUS_COLORS[ticket.status], border: '1px solid ' + STATUS_COLORS[ticket.status] }}>{ticket.status}</span>
                <span style={{ fontSize: '11px', padding: '2px 8px', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--muted)' }}>{ticket.category}</span>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>#{ticket.id}</span>
            </div>

            {/* Message thread */}
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '500px', overflowY: 'auto' }}>
              {messages.length === 0 && <p style={{ color: 'var(--muted)', fontSize: '13px' }}>No messages yet.</p>}
              {messages.map(m => (
                <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: m.is_admin ? 'flex-start' : 'flex-end' }}>
                  <div style={{ maxWidth: '80%' }}>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '3px', textAlign: m.is_admin ? 'left' : 'right' }}>
                      {m.is_admin ? <span style={{ color: '#ea4335', fontWeight: 600 }}>Admin</span> : <span style={{ fontWeight: 600 }}>{m.author_name}</span>}
                      {' · '}{timeAgo(m.created_at)}
                    </div>
                    <div style={{
                      padding: '10px 14px',
                      borderRadius: m.is_admin ? '4px 16px 16px 16px' : '16px 4px 16px 16px',
                      background: m.is_admin ? 'rgba(234,67,53,0.08)' : 'rgba(66,133,244,0.08)',
                      border: '1px solid ' + (m.is_admin ? 'rgba(234,67,53,0.2)' : 'rgba(66,133,244,0.2)'),
                      fontSize: '14px',
                      color: 'var(--text)',
                      lineHeight: 1.6,
                      whiteSpace: 'pre-wrap',
                    }}>
                      {m.body}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Reply box */}
            {canReply && (
              <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px' }}>
                <textarea
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  placeholder="Write a reply..."
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply() } }}
                  style={{ ...inp, minHeight: '60px', resize: 'none', flex: 1 }}
                />
                <button onClick={sendReply} style={{ ...btn(), alignSelf: 'flex-end', whiteSpace: 'nowrap' }}>Send</button>
              </div>
            )}
            {(ticket.status === 'closed' || ticket.status === 'resolved') && (
              <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', fontSize: '13px', color: 'var(--muted)', textAlign: 'center', display: 'flex', justifyContent: 'center', gap: '12px', alignItems: 'center' }}>
                <span>Ticket {ticket.status}.</span>
                <button onClick={archiveTicket} style={{ color: '#9aa0a6', background: 'none', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', padding: '4px 10px' }}>Archive & Open New</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
