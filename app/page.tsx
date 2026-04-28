// @ts-nocheck
'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function LandingPage() {
  const [stats, setStats] = useState({ factions: 0, members: 0, posts: 0 })
  const [recentPosts, setRecentPosts] = useState([])
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    // Redirect logged in users to dashboard
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.push('/dashboard')
    })
    const local = typeof window !== 'undefined' ? localStorage.getItem('archon-member') : null
    if (local) router.push('/dashboard')
  }, [])

  useEffect(() => {
    async function load() {
      const [f, m, p, rp] = await Promise.all([
        supabase.from('factions').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('members').select('*', { count: 'exact', head: true }),
        supabase.from('posts').select('*', { count: 'exact', head: true }),
        supabase.from('posts').select('*, members(username)').eq('visibility', 'free').order('created_at', { ascending: false }).limit(5),
      ])
      setStats({ factions: f.count || 0, members: m.count || 0, posts: p.count || 0 })
      setRecentPosts(rp.data || [])
    }
    load()
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0b', fontFamily: 'arial, sans-serif', position: 'relative', overflow: 'hidden' }}>
      {/* Background effect */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(ellipse at 50% 30%, rgba(200,150,12,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: '20%', left: '10%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(200,150,12,0.04) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: '40%', right: '5%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(100,80,200,0.03) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* Nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 48px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <span style={{ fontSize: '24px', fontWeight: 700, background: 'linear-gradient(180deg, #1a1a1a 0%, #c8960c 60%, #ffd700 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>ARCHON</span>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <Link href="/dashboard" style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Browse</Link>
          <Link href="/login" style={{ fontSize: '14px', padding: '8px 20px', border: '1px solid rgba(200,150,12,0.5)', color: '#c8960c', borderRadius: '4px', textDecoration: 'none' }}>Enter</Link>
        </div>
      </div>

      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '120px 24px 80px' }}>
        <div style={{ fontSize: '11px', letterSpacing: '4px', color: 'rgba(200,150,12,0.6)', textTransform: 'uppercase', marginBottom: '24px' }}>The Faction Network</div>
        <h1 style={{ fontSize: '72px', fontWeight: 700, letterSpacing: '-3px', lineHeight: 1, marginBottom: '24px', background: 'linear-gradient(180deg, #ffffff 0%, #c8960c 50%, #8b6400 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          ARCHON
        </h1>
        <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.35)', maxWidth: '480px', margin: '0 auto 48px', lineHeight: 1.7 }}>
          A hierarchy of factions, a world of content. Join, rise, and claim your place.
        </p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <Link href="/login" style={{ padding: '14px 32px', background: 'linear-gradient(135deg, #c8960c, #ffd700)', color: '#0a0a0b', borderRadius: '4px', textDecoration: 'none', fontWeight: 700, fontSize: '15px' }}>Join ARCHON</Link>
          <Link href="/dashboard" style={{ padding: '14px 32px', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', borderRadius: '4px', textDecoration: 'none', fontSize: '15px' }}>Browse</Link>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '64px', padding: '48px 24px', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        {[['Factions', stats.factions], ['Members', stats.members], ['Posts', stats.posts]].map(([label, value]) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '36px', fontWeight: 700, color: '#c8960c', marginBottom: '4px' }}>{value}</div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', letterSpacing: '2px', textTransform: 'uppercase' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '80px 24px' }}>
        <h2 style={{ fontSize: '13px', letterSpacing: '3px', color: 'rgba(200,150,12,0.6)', textTransform: 'uppercase', textAlign: 'center', marginBottom: '48px' }}>How It Works</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px' }}>
          {[
            ['⚔️', 'Factions', 'Join a faction led by a Ruler. Compete, collaborate, and build your faction\'s presence.'],
            ['📜', 'Posts', 'Publish content to the network. Control who sees it based on tier. Earn XP for every view.'],
            ['🏆', 'Rise', 'Earn XP through activity. Level up. Unlock achievements. Upgrade your tier.'],
            ['👁️', 'Hierarchy', 'From Free to Gold, each tier unlocks more of the network. Power is earned.'],
          ].map(([icon, title, desc]) => (
            <div key={title} style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '24px' }}>
              <div style={{ fontSize: '24px', marginBottom: '12px' }}>{icon}</div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: '8px' }}>{title}</div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', lineHeight: 1.7 }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      {recentPosts.length > 0 && (
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '0 24px 80px' }}>
          <h2 style={{ fontSize: '13px', letterSpacing: '3px', color: 'rgba(200,150,12,0.6)', textTransform: 'uppercase', marginBottom: '24px' }}>Recent Activity</h2>
          {recentPosts.map(p => (
            <Link key={p.id} href={'/posts/' + p.id} style={{ display: 'block', padding: '16px', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', marginBottom: '8px', textDecoration: 'none' }}>
              <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', marginBottom: '4px' }}>{p.title || 'Untitled post'}</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)' }}>{p.members?.username} · {new Date(p.created_at).toLocaleDateString()}</div>
            </Link>
          ))}
        </div>
      )}

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '24px', borderTop: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.15)', fontSize: '12px' }}>
        ARCHON · The Faction Network
      </div>
    </div>
  )
}
