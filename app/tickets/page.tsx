// @ts-nocheck
'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const CATEGORIES = ['Bug Report', 'Tier Upgrade', 'Appeal', 'General Support']
const STATUS_COLORS = { open: '#4285f4', 'in-progress': '#fbbc05', resolved: '#34a853', closed: '#9aa0a6' }

function timeAgo(date) {
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  return days + ' days ago'
}

export default function TicketsPage() {
  const [member, setMember] = useState(null)
  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [category, setCategory] = useState('General Support')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
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

    // Get their active ticket
    const { data: t } = await supabase.from('tickets').select('*').eq('member_id', m.id).order('created_at', { ascending: false }).limit(1).single()
    setTicket(t)
    setLoading(false)
  }

  async function submitTicket() {
    if (!title.trim() || !body.trim()) { setMsg('Fill in all fields'); return }
    if (ticket && ticket.status !== 'resolved' && ticket.status !== 'closed') {
      setMsg('You already have an open ticket. Wait for it to be resolved first.'); return
    }
    const { error } = await supabase.from('tickets').insert({
      member_id: member.id,
      category,
      title: title.trim(),
      body: body.trim(),
      status: 'open',
    })
    if (error) { setMsg(error.message); return }
    setTitle(''); setBody(''); setShowForm(false); setMsg('')
    load()
  }

  const canOpenNew = !ticket || ticket.status === 'resolved' || ticket.status === 'closed'
  const inp = { padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '14px', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'arial, sans-serif', width: '100%' }
  const btn = (bg='#4285f4') => ({ padding: '8px 16px', background: bg, color: '#fff', border: 'none', borderRadius: '4px', fontSize: '13px', cursor: 'pointer', fontFamily: 'arial, sans-serif' })

  if (loading) return <div style={{ padding: '40px', fontFamily: 'arial, sans-serif', color: 'var(--muted)' }}>Loading...</div>

  return (
    <div style={{ fontFamily: 'arial, sans-serif', minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 24px', borderBottom: '1px solid var(--border)' }}>
        <Link href="/dashboard" style={{ fontSize: '22px', fontWeight: 700, background: 'linear-gradient(180deg,#1a1a1a 0%,#c8960c 75%,#ffd700 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', textDecoration: 'none' }}>ARCHON</Link>
        <span style={{ color: 'var(--muted)' }}>›</span>
        <span style={{ fontSize: '14px', color: 'var(--text)' }}>Support Tickets</span>
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
            <p style={{ marginBottom: '16px' }}>You have no tickets yet.</p>
            <button onClick={() => setShowForm(true)} style={btn()}>Open a Ticket</button>
          </div>
        )}

        {ticket && (
          <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: STATUS_COLORS[ticket.status] + '22', color: STATUS_COLORS[ticket.status], border: '1px solid ' + STATUS_COLORS[ticket.status], marginRight: '8px' }}>{ticket.status}</span>
                <span style={{ fontSize: '11px', padding: '2px 8px', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--muted)' }}>{ticket.category}</span>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>#{ticket.id} · {timeAgo(ticket.created_at)}</span>
            </div>
            <div style={{ padding: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text)', marginBottom: '12px' }}>{ticket.title}</h2>
              <div style={{ fontSize: '14px', color: 'var(--text)', lineHeight: 1.7, whiteSpace: 'pre-wrap', marginBottom: '20px', padding: '12px', background: 'var(--bg-secondary)', borderRadius: '6px' }}>{ticket.body}</div>

              {ticket.admin_reply ? (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#ea4335' }}>Admin</span>
                    <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{ticket.replied_by}</span>
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--text)', lineHeight: 1.7, whiteSpace: 'pre-wrap', padding: '12px', background: 'rgba(234,67,53,0.05)', border: '1px solid rgba(234,67,53,0.2)', borderRadius: '6px' }}>{ticket.admin_reply}</div>
                </div>
              ) : (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', color: 'var(--muted)', fontSize: '13px' }}>
                  Awaiting admin response...
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
