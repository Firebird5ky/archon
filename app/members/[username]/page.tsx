// @ts-nocheck
'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { useParams } from 'next/navigation'

const TIER_COLORS = { free: '#9aa0a6', bronze: '#cd7f32', silver: '#aaa9ad', gold: '#ffd700' }

function calcLevel(xp) {
  let level = 0, threshold = 20, total = 0
  while (total + threshold <= xp) { total += threshold; level++; threshold *= 2 }
  return { level, currentXp: xp - total, needed: threshold }
}

function timeAgo(date) {
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return '1 day ago'
  if (days < 30) return days + ' days ago'
  if (days < 365) return Math.floor(days / 30) + ' months ago'
  return Math.floor(days / 365) + ' years ago'
}

export default function MemberProfile() {
  const [member, setMember] = useState(null)
  const [posts, setPosts] = useState([])
  const [achievements, setAchievements] = useState([])
  const [faction, setFaction] = useState(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const params = useParams()
  const username = decodeURIComponent(params.username)

  useEffect(() => { load() }, [username])

  async function load() {
    setLoading(true)
    const { data: m } = await supabase.from('members').select('*').eq('username', username).single()
    if (!m) { setLoading(false); return }
    setMember(m)

    const [postsRes, achRes, factionRes] = await Promise.all([
      supabase.from('posts').select('*').eq('author_id', m.id).order('created_at', { ascending: false }).limit(10),
      supabase.from('member_achievements').select('*, achievements(*)').eq('member_id', m.id),
      supabase.from('faction_members').select('*, factions(*)').eq('member_id', m.id).single(),
    ])
    setPosts(postsRes.data || [])
    setAchievements(achRes.data || [])
    setFaction(factionRes.data?.factions || null)
    setLoading(false)
  }

  if (loading) return <div style={{ padding: '40px', fontFamily: 'arial, sans-serif', color: 'var(--muted)' }}>Loading...</div>
  if (!member) return <div style={{ padding: '40px', fontFamily: 'arial, sans-serif' }}>Member not found. <Link href="/dashboard" style={{ color: '#4285f4' }}>Back</Link></div>

  const { level, currentXp, needed } = calcLevel(member.total_xp || 0)
  const tierColor = TIER_COLORS[member.tier] || TIER_COLORS.free
  const progress = Math.round((currentXp / needed) * 100)

  return (
    <div style={{ fontFamily: 'arial, sans-serif', minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 24px', borderBottom: '1px solid var(--border)' }}>
        <Link href="/dashboard" style={{ fontSize: '22px', fontWeight: 700, background: 'linear-gradient(180deg,#1a1a1a 0%,#c8960c 75%,#ffd700 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', textDecoration: 'none' }}>ARCHON</Link>
        <span style={{ color: 'var(--muted)' }}>›</span>
        <span style={{ fontSize: '14px', color: 'var(--muted)' }}>members</span>
        <span style={{ color: 'var(--muted)' }}>›</span>
        <span style={{ fontSize: '14px', color: 'var(--text)' }}>{member.username}</span>
      </div>

      <div style={{ maxWidth: '860px', padding: '32px 24px', display: 'flex', gap: '32px' }}>
        {/* Left - main info */}
        <div style={{ flex: 1 }}>
          <div style={{ marginBottom: '32px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>{member.display_name || member.username}</h1>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
              <span style={{ fontSize: '13px', padding: '3px 10px', border: '1px solid ' + tierColor, color: tierColor, borderRadius: '12px' }}>{member.tier}</span>
              <span style={{ fontSize: '13px', color: 'var(--muted)' }}>Level {level}</span>
              {faction && <Link href={'/f/' + faction.name} style={{ fontSize: '13px', color: '#4285f4', textDecoration: 'none' }}>{faction.name}</Link>}
              <span style={{ fontSize: '13px', color: 'var(--muted)' }}>Joined {timeAgo(member.joined_at)}</span>
              <span style={{ fontSize: '13px', color: 'var(--muted)' }}>{member.total_posts || 0} posts</span>
            </div>

            {/* XP bar */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Level {level} → {level + 1}</span>
                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{currentXp}/{needed} XP</span>
              </div>
              <div style={{ height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: progress + '%', background: 'linear-gradient(90deg, #c8960c, #ffd700)', borderRadius: '3px', transition: 'width 0.3s' }} />
              </div>
            </div>
          </div>

          {/* Achievements */}
          {achievements.length > 0 && (
            <div style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '14px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Achievements</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {achievements.map(a => (
                  <div key={a.id} title={a.achievements?.description} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', border: '1px solid var(--border)', borderRadius: '20px', fontSize: '13px', color: 'var(--text)' }}>
                    <span>{a.achievements?.icon}</span>
                    <span>{a.achievements?.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Posts */}
          <div>
            <h2 style={{ fontSize: '14px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px' }}>Recent Posts</h2>
            {posts.length === 0 && <p style={{ color: 'var(--muted)', fontSize: '14px' }}>No posts yet.</p>}
            {posts.map(p => (
              <div key={p.id} style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '12px', color: '#188038', marginBottom: '2px' }}>posts › {member.username}</div>
                <Link href={'/posts/' + p.id} style={{ fontSize: '16px', color: '#1a0dab', textDecoration: 'none', display: 'block', marginBottom: '4px' }}>
                  {p.title || 'Untitled post'}
                </Link>
                <div style={{ fontSize: '13px', color: 'var(--muted)' }}>{p.body.substring(0, 120)}{p.body.length > 120 ? '...' : ''}</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>{timeAgo(p.created_at)} · {p.view_count || 0} views</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right sidebar stats */}
        <div style={{ width: '200px', flexShrink: 0 }}>
          <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }}>Stats</div>
            </div>
            {[
              ['Level', level],
              ['Tier', member.tier],
              ['Posts', member.total_posts || 0],
              ['Views', member.total_views || 0],
              ['Streak', (member.login_streak || 0) + ' days'],
              ['Member for', timeAgo(member.joined_at)],
            ].map(([label, value]) => (
              <div key={label} style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--muted)' }}>{label}</span>
                <span style={{ color: 'var(--text)', fontWeight: 500 }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
