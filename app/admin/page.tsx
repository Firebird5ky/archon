// @ts-nocheck
'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const ADMIN_HASH = '$2a$12$mtlNobkrqQsmmAyt9mnfSOBFkje2X6aNRIuvWmMIVtzaT39Sy0ZOi'

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [user, setUser] = useState('')
  const [pass, setPass] = useState('')
  const [loginMsg, setLoginMsg] = useState('')
  const [tab, setTab] = useState('factions')
  const [factions, setFactions] = useState([])
  const [members, setMembers] = useState([])
  const [requests, setRequests] = useState([])
  const [fName, setFName] = useState('')
  const [fTag, setFTag] = useState('')
  const [fDesc, setFDesc] = useState('')
  const [fColor, setFColor] = useState('#4285f4')
  const [fMsg, setFMsg] = useState('')
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    if (authed) loadAll()
  }, [authed])

  async function handleAdminLogin() {
    if (user !== 'archon_admin') { setLoginMsg('Invalid credentials'); return }
    const res = await fetch('/api/auth/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pass, hash: ADMIN_HASH }) })
    const { match } = await res.json()
    if (match) { setAuthed(true) } else { setLoginMsg('Invalid credentials') }
  }

  async function loadAll() {
    const [f, m, r] = await Promise.all([
      supabase.from('factions').select('*').order('created_at'),
      supabase.from('members').select('*').order('joined_at', { ascending: false }),
      supabase.from('build_requests').select('*, members(username)').order('created_at', { ascending: false }),
    ])
    setFactions(f.data || [])
    setMembers(m.data || [])
    setRequests(r.data || [])
  }

  async function createFaction() {
    if (!fName || !fTag) { setFMsg('Name and tag required'); return }
    const { error } = await supabase.from('factions').insert({ name: fName, tag: fTag.toUpperCase(), description: fDesc, color: fColor })
    if (error) { setFMsg(error.message); return }
    setFMsg('Created.'); setFName(''); setFTag(''); setFDesc('')
    loadAll()
  }

  async function setTier(id, tier) {
    await supabase.from('members').update({ tier }).eq('id', id)
    loadAll()
  }

  async function setRole(id, role) {
    await supabase.from('members').update({ role }).eq('id', id)
    loadAll()
  }

  async function banMember(id, banned) {
    await supabase.from('members').update({ is_banned: banned }).eq('id', id)
    loadAll()
  }

  async function deleteFaction(id) {
    if (!confirm('Delete?')) return
    await supabase.from('factions').delete().eq('id', id)
    loadAll()
  }

  async function updateRequest(id, status, response) {
    await supabase.from('build_requests').update({ status, response, updated_at: new Date().toISOString() }).eq('id', id)
    loadAll()
  }

  async function assignRuler(memberId, factionId, title) {
    await supabase.from('rulers').upsert({ member_id: memberId, faction_id: parseInt(factionId), title, is_active: true }, { onConflict: 'member_id' })
    loadAll()
  }

  const inp = { padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '14px', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'arial, sans-serif' }
  const btn = (bg='#4285f4') => ({ padding: '6px 14px', background: bg, color: '#fff', border: 'none', borderRadius: '4px', fontSize: '13px', cursor: 'pointer', fontFamily: 'arial, sans-serif' })
  const th = { textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid var(--border)', color: 'var(--muted)', fontWeight: 500, fontSize: '12px' }
  const td = { padding: '8px 12px', borderBottom: '1px solid var(--border)', color: 'var(--text)', fontSize: '13px' }
  const sel = { padding: '4px 6px', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '12px', background: 'var(--bg)', color: 'var(--text)' }

  if (!authed) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', fontFamily: 'arial, sans-serif' }}>
      <div style={{ width: '300px', border: '1px solid var(--border)', borderRadius: '8px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>Admin Login</h2>
        <input style={inp} placeholder="Username" value={user} onChange={e => setUser(e.target.value)} />
        <input style={inp} type="password" placeholder="Password" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdminLogin()} />
        {loginMsg && <p style={{ fontSize: '13px', color: '#ea4335' }}>{loginMsg}</p>}
        <button onClick={handleAdminLogin} style={btn()}>Login</button>
        <button onClick={() => router.push('/dashboard')} style={{ ...btn('none'), color: 'var(--muted)', border: '1px solid var(--border)' }}>Back</button>
      </div>
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
        {['factions', 'members', 'rulers', 'requests'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '10px 16px', fontSize: '13px', background: 'none', border: 'none', borderBottom: tab===t ? '3px solid #4285f4' : '3px solid transparent', color: tab===t ? '#4285f4' : 'var(--muted)', cursor: 'pointer', fontFamily: 'arial, sans-serif', textTransform: 'capitalize' }}>{t}</button>
        ))}
      </div>

      <div style={{ padding: '24px', maxWidth: '960px' }}>
        {tab === 'factions' && (
          <>
            <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px', color: 'var(--text)' }}>Create Faction</h2>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
              <input style={inp} placeholder="Name" value={fName} onChange={e => setFName(e.target.value)} />
              <input style={{ ...inp, width: '80px' }} placeholder="Tag" value={fTag} onChange={e => setFTag(e.target.value)} maxLength={8} />
              <input style={{ ...inp, flex: 1, minWidth: '180px' }} placeholder="Description" value={fDesc} onChange={e => setFDesc(e.target.value)} />
              <input type="color" value={fColor} onChange={e => setFColor(e.target.value)} style={{ width: '40px', height: '36px', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer' }} />
              <button style={btn()} onClick={createFaction}>Create</button>
            </div>
            {fMsg && <p style={{ fontSize: '13px', color: '#34a853', marginBottom: '16px' }}>{fMsg}</p>}
            <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px', marginTop: '24px', color: 'var(--text)' }}>All Factions</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th style={th}>Name</th><th style={th}>Tag</th><th style={th}>Color</th><th style={th}>Actions</th></tr></thead>
              <tbody>
                {factions.map(f => (
                  <tr key={f.id}>
                    <td style={td}>{f.name}</td>
                    <td style={td}>[{f.tag}]</td>
                    <td style={td}><span style={{ display:'inline-block', width:'16px', height:'16px', background: f.color, borderRadius:'2px' }} /></td>
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
              <thead><tr><th style={th}>Username</th><th style={th}>Auth</th><th style={th}>Tier</th><th style={th}>Role</th><th style={th}>Actions</th></tr></thead>
              <tbody>
                {members.map(m => (
                  <tr key={m.id}>
                    <td style={td}>{m.username}</td>
                    <td style={td}>{m.auth_type || 'discord'}</td>
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
                    <td style={td}>
                      <button style={btn(m.is_banned ? '#34a853' : '#ea4335')} onClick={() => banMember(m.id, !m.is_banned)}>{m.is_banned ? 'Unban' : 'Ban'}</button>
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
            <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '16px' }}>Set role to Ruler in Members tab first.</p>
            <RulerAssign members={members.filter(m => m.role === 'ruler')} factions={factions} onAssign={assignRuler} />
          </>
        )}

        {tab === 'requests' && (
          <>
            <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px', color: 'var(--text)' }}>Build Requests</h2>
            {requests.length === 0 && <p style={{ color: 'var(--muted)', fontSize: '13px' }}>No requests.</p>}
            {requests.map(r => <RequestCard key={r.id} request={r} onUpdate={updateRequest} />)}
          </>
        )}
      </div>
    </div>
  )
}

function RulerAssign({ members, factions, onAssign }) {
  const [mid, setMid] = useState('')
  const [fid, setFid] = useState('')
  const [title, setTitle] = useState('Ruler')
  const [msg, setMsg] = useState('')
  const sel = { padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '14px', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'arial, sans-serif' }
  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
      <select style={sel} value={mid} onChange={e => setMid(e.target.value)}>
        <option value="">Select member</option>
        {members.map(m => <option key={m.id} value={m.id}>{m.username}</option>)}
      </select>
      <select style={sel} value={fid} onChange={e => setFid(e.target.value)}>
        <option value="">Select faction</option>
        {factions.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
      </select>
      <input style={{ ...sel, width: '120px' }} placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
      <button onClick={async () => { if (!mid || !fid) { setMsg('Select both'); return }; await onAssign(mid, fid, title); setMsg('Assigned.') }} style={{ padding: '8px 16px', background: '#4285f4', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '13px', cursor: 'pointer' }}>Assign</button>
      {msg && <span style={{ fontSize: '13px', color: '#34a853' }}>{msg}</span>}
    </div>
  )
}

function RequestCard({ request, onUpdate }) {
  const [response, setResponse] = useState(request.response || '')
  const btn = (bg) => ({ padding: '6px 12px', background: bg, color: '#fff', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' })
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)' }}>{request.title}</span>
        <span style={{ fontSize: '11px', padding: '2px 8px', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--muted)' }}>{request.status}</span>
      </div>
      <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px' }}>From: {request.members?.username} · {new Date(request.created_at).toLocaleDateString()}</div>
      <div style={{ fontSize: '13px', color: 'var(--text)', marginBottom: '12px', lineHeight: 1.6 }}>{request.description}</div>
      <textarea value={response} onChange={e => setResponse(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '13px', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'arial, sans-serif', resize: 'vertical', minHeight: '60px', marginBottom: '8px' }} />
      <div style={{ display: 'flex', gap: '8px' }}>
        <button style={btn('#34a853')} onClick={() => onUpdate(request.id, 'approved', response)}>Approve</button>
        <button style={btn('#4285f4')} onClick={() => onUpdate(request.id, 'in_progress', response)}>In Progress</button>
        <button style={btn('#fbbc05')} onClick={() => onUpdate(request.id, 'done', response)}>Done</button>
        <button style={btn('#ea4335')} onClick={() => onUpdate(request.id, 'rejected', response)}>Reject</button>
      </div>
    </div>
  )
}
