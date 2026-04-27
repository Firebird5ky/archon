'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const DEITY_USERNAME = 'firebird08282'

type Tab = 'factions' | 'members' | 'rulers' | 'requests'

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('factions')
  const [user, setUser] = useState<any>(null)
  const [authorized, setAuthorized] = useState(false)
  const [factions, setFactions] = useState<any[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [fName, setFName] = useState('')
  const [fTag, setFTag] = useState('')
  const [fDesc, setFDesc] = useState('')
  const [fColor, setFColor] = useState('#4285f4')
  const [fMsg, setFMsg] = useState('')
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user
      setUser(u)
      const uname = u?.user_metadata?.full_name || u?.user_metadata?.name || ''
      if (uname.toLowerCase() === DEITY_USERNAME.toLowerCase()) {
        setAuthorized(true)
        loadAll()
      } else {
        setAuthorized(false)
        setLoading(false)
      }
    })
  }, [])

  async function loadAll() {
    setLoading(true)
    const [f, m, r] = await Promise.all([
      supabase.from('factions').select('*').order('created_at'),
      supabase.from('members').select('*').order('joined_at', { ascending: false }),
      supabase.from('build_requests').select('*, members(username)').order('created_at', { ascending: false }),
    ])
    setFactions(f.data || [])
    setMembers(m.data || [])
    setRequests(r.data || [])
    setLoading(false)
  }

  async function createFaction() {
    if (!fName || !fTag) { setFMsg('Name and tag required'); return }
    const { error } = await supabase.from('factions').insert({ name: fName, tag: fTag.toUpperCase(), description: fDesc, color: fColor })
    if (error) { setFMsg(error.message); return }
    setFMsg('Faction created.')
    setFName(''); setFTag(''); setFDesc('')
    loadAll()
  }

  async function setTier(id: any, tier: string) {
    await supabase.from('members').update({ tier }).eq('id', id)
    loadAll()
  }

  async function setRole(id: any, role: string) {
    await supabase.from('members').update({ role }).eq('id', id)
    loadAll()
  }

  async function banMember(id: any, banned: boolean) {
    await supabase.from('members').update({ is_banned: banned }).eq('id', id)
    loadAll()
  }

  async function updateRequest(id: number, status: string, response: string) {
    await supabase.from('build_requests').update({ status, response, updated_at: new Date().toISOString() }).eq('id', id)
    loadAll()
  }

  async function deleteFaction(id: number) {
    if (!confirm('Delete this faction?')) return
    await supabase.from('factions').delete().eq('id', id)
    loadAll()
  }

  async function assignRuler(memberId: any, factionId: number, title: string) {
    const { error } = await supabase.from('rulers').upsert({ member_id: memberId, faction_id: factionId, title, is_active: true }, { onConflict: 'member_id' })
    if (!error) loadAll()
    return error
  }

  const input = { padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '14px', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'arial, sans-serif' }
  const btn = (bg = '#4285f4') => ({ padding: '6px 14px', background: bg, color: '#fff', border: 'none', borderRadius: '4px', fontSize: '13px', cursor: 'pointer', fontFamily: 'arial, sans-serif' })
  const th = { textAlign: 'left' as any, padding: '8px 12px', borderBottom: '1px solid var(--border)', color: 'var(--muted)', fontWeight: 500, fontSize: '12px' }
  const td = { padding: '8px 12px', borderBottom: '1px solid var(--border)', color: 'var(--text)', fontSize: '13px' }
  const sel = { padding: '4px 6px', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '12px', background: 'var(--bg)', color: 'var(--text)' }

  if (loading) return <div style={{ padding: '40px', fontFamily: 'arial, sans-serif', color: 'var(--muted)' }}>Loading...</div>

  if (!authorized) return (
    <div style={{ padding: '40px', fontFamily: 'arial, sans-serif', color: 'var(--text)' }}>
      <h2>Access Denied</h2>
      <button onClick={() => router.push('/dashboard')} style={btn()}>Back</button>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'arial, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 24px', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: '20px', fontWeight: 700, background: 'linear-gradient(180deg,#1a1a1a 0%,#c8960c 75%,#ffd700 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>ARCHON</span>
        <span style={{ fontSize: '11px', padding: '2px 8px', background: '#ea4335', color: '#fff', borderRadius: '4px', fontWeight: 600 }}>ADMIN</span>
        <button onClick={() => router.push('/dashboard')} style={{ marginLeft: 'auto', fontSize: '13px', color: '#4285f4', background: 'none', border: 'none', cursor: 'pointer' }}>Dashboard</button>
      </div>

      <div style={{ display: 'flex', padding: '0 24px', borderBottom: '1px solid var(--border)' }}>
        {(['factions','members','rulers','requests'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '10px 16px', fontSize: '13px', background: 'none', border: 'none', borderBottom: tab===t ? '3px solid #4285f4' : '3px solid transparent', color: tab===t ? '#4285f4' : 'var(--muted)', cursor: 'pointer', fontFamily: 'arial, sans-serif', textTransform: 'capitalize' }}>{t}</button>
        ))}
      </div>

      <div style={{ padding: '24px', maxWidth: '960px' }}>

        {tab === 'factions' && (
          <>
            <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px', color: 'var(--text)' }}>Create Faction</h2>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
              <input style={input} placeholder="Faction name" value={fName} onChange={e => setFName(e.target.value)} />
              <input style={{ ...input, width: '80px' }} placeholder="Tag" value={fTag} onChange={e => setFTag(e.target.value)} maxLength={8} />
              <input style={{ ...input, flex: 1, minWidth: '180px' }} placeholder="Description" value={fDesc} onChange={e => setFDesc(e.target.value)} />
              <input type="color" value={fColor} onChange={e => setFColor(e.target.value)} style={{ width: '40px', height: '36px', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer' }} />
              <button style={btn()} onClick={createFaction}>Create</button>
            </div>
            {fMsg && <p style={{ fontSize: '13px', color: '#34a853', marginBottom: '16px' }}>{fMsg}</p>}

            <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px', marginTop: '24px', color: 'var(--text)' }}>All Factions</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th style={th}>Name</th><th style={th}>Tag</th><th style={th}>Color</th><th style={th}>Active</th><th style={th}>Actions</th></tr></thead>
              <tbody>
                {factions.map(f => (
                  <tr key={f.id}>
                    <td style={td}>{f.name}</td>
                    <td style={td}>[{f.tag}]</td>
                    <td style={td}><span style={{ display:'inline-block', width:'16px', height:'16px', background: f.color, borderRadius:'2px' }} /></td>
                    <td style={td}>{f.is_active ? 'Yes' : 'No'}</td>
                    <td style={td}><button style={btn('#ea4335')} onClick={() => deleteFaction(f.id)}>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {tab === 'members' && (
          <>
            <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px', color: 'var(--text)' }}>Members ({members.length})</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th style={th}>Username</th><th style={th}>Tier</th><th style={th}>Role</th><th style={th}>XP</th><th style={th}>Actions</th></tr></thead>
              <tbody>
                {members.map(m => (
                  <tr key={m.id}>
                    <td style={td}>{m.username}</td>
                    <td style={td}>
                      <select style={sel} value={m.tier} onChange={e => setTier(m.id, e.target.value)}>
                        <option value="free">Free</option>
                        <option value="bronze">Bronze</option>
                        <option value="silver">Silver</option>
                        <option value="gold">Gold</option>
                      </select>
                    </td>
                    <td style={td}>
                      <select style={sel} value={m.role} onChange={e => setRole(m.id, e.target.value)}>
                        <option value="member">Member</option>
                        <option value="ruler">Ruler</option>
                        <option value="deity">Deity</option>
                      </select>
                    </td>
                    <td style={td}>{m.total_xp}</td>
                    <td style={td}>
                      <button style={btn(m.is_banned ? '#34a853' : '#ea4335')} onClick={() => banMember(m.id, !m.is_banned)}>
                        {m.is_banned ? 'Unban' : 'Ban'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {tab === 'rulers' && (
          <>
            <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '8px', color: 'var(--text)' }}>Assign Rulers</h2>
            <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '16px' }}>Set role to "Ruler" in Members tab first.</p>
            <RulerAssign members={members.filter(m => m.role === 'ruler')} factions={factions} onAssign={assignRuler} />
          </>
        )}

        {tab === 'requests' && (
          <>
            <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px', color: 'var(--text)' }}>Build Requests</h2>
            {requests.length === 0 && <p style={{ color: 'var(--muted)', fontSize: '13px' }}>No requests yet.</p>}
            {requests.map(r => <RequestCard key={r.id} request={r} onUpdate={updateRequest} />)}
          </>
        )}

      </div>
    </div>
  )
}

function RulerAssign({ members, factions, onAssign }: any) {
  const [mid, setMid] = useState('')
  const [fid, setFid] = useState('')
  const [title, setTitle] = useState('Ruler')
  const [msg, setMsg] = useState('')
  const sel = { padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '14px', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'arial, sans-serif' }
  async function assign() {
    if (!mid || !fid) { setMsg('Select both'); return }
    const err = await onAssign(mid, parseInt(fid), title)
    setMsg(err ? err.message : 'Assigned.')
  }
  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
      <select style={sel} value={mid} onChange={e => setMid(e.target.value)}>
        <option value="">Select member</option>
        {members.map((m: any) => <option key={m.id} value={m.id}>{m.username}</option>)}
      </select>
      <select style={sel} value={fid} onChange={e => setFid(e.target.value)}>
        <option value="">Select faction</option>
        {factions.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
      </select>
      <input style={{ ...sel, width: '120px' }} placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
      <button onClick={assign} style={{ padding: '8px 16px', background: '#4285f4', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '13px', cursor: 'pointer' }}>Assign</button>
      {msg && <span style={{ fontSize: '13px', color: '#34a853' }}>{msg}</span>}
    </div>
  )
}

function RequestCard({ request, onUpdate }: any) {
  const [response, setResponse] = useState(request.response || '')
  const btn = (bg: string) => ({ padding: '6px 12px', background: bg, color: '#fff', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' })
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)' }}>{request.title}</span>
        <span style={{ fontSize: '11px', padding: '2px 8px', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--muted)' }}>{request.status}</span>
      </div>
      <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px' }}>From: {request.members?.username} · {new Date(request.created_at).toLocaleDateString()}</div>
      <div style={{ fontSize: '13px', color: 'var(--text)', marginBottom: '12px', lineHeight: 1.6 }}>{request.description}</div>
      <textarea value={response} onChange={e => setResponse(e.target.value)} placeholder="Your response..." style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '13px', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'arial, sans-serif', resize: 'vertical', minHeight: '60px', marginBottom: '8px' }} />
      <div style={{ display: 'flex', gap: '8px' }}>
        <button style={btn('#34a853')} onClick={() => onUpdate(request.id, 'approved', response)}>Approve</button>
        <button style={btn('#4285f4')} onClick={() => onUpdate(request.id, 'in_progress', response)}>In Progress</button>
        <button style={btn('#fbbc05')} onClick={() => onUpdate(request.id, 'done', response)}>Done</button>
        <button style={btn('#ea4335')} onClick={() => onUpdate(request.id, 'rejected', response)}>Reject</button>
      </div>
    </div>
  )
}
