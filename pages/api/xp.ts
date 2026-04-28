// @ts-nocheck
import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function calcLevel(xp: number): number {
  let level = 0
  let threshold = 20
  let total = 0
  while (total + threshold <= xp) {
    total += threshold
    level++
    threshold *= 2
  }
  return level
}

async function checkAchievements(memberId: any, member: any) {
  const earned: string[] = []
  const { data: existing } = await supabase.from('member_achievements').select('achievement_id, achievements(key)').eq('member_id', memberId)
  const earnedKeys = existing?.map((e: any) => e.achievements?.key) || []

  const checks: { key: string; condition: boolean }[] = [
    { key: 'first_post', condition: member.total_posts >= 1 },
    { key: 'ten_posts', condition: member.total_posts >= 10 },
    { key: 'fifty_posts', condition: member.total_posts >= 50 },
    { key: 'veteran_30', condition: member.account_age_days >= 30 },
    { key: 'elder_90', condition: member.account_age_days >= 90 },
    { key: 'streak_7', condition: member.login_streak >= 7 },
    { key: 'views_50', condition: member.total_views >= 50 },
    { key: 'views_200', condition: member.total_views >= 200 },
  ]

  for (const check of checks) {
    if (check.condition && !earnedKeys.includes(check.key)) {
      const { data: ach } = await supabase.from('achievements').select('id').eq('key', check.key).single()
      if (ach) {
        await supabase.from('member_achievements').insert({ member_id: memberId, achievement_id: ach.id })
        earned.push(check.key)
      }
    }
  }
  return earned
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const { member_id, action } = req.body
  if (!member_id || !action) return res.status(400).json({ error: 'Missing fields' })

  const { data: member } = await supabase.from('members').select('*').eq('id', member_id).single()
  if (!member) return res.status(404).json({ error: 'Member not found' })

  let xpGain = 0
  let updates: any = {}

  if (action === 'post') {
    xpGain = 5
    updates.total_posts = (member.total_posts || 0) + 1
  }

  if (action === 'login') {
    const today = new Date().toISOString().split('T')[0]
    const lastLogin = member.last_login_date
    if (lastLogin !== today) {
      xpGain = 15
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
      const streak = lastLogin === yesterday ? (member.login_streak || 0) + 1 : 1
      updates.login_streak = streak
      updates.last_login_date = today
    }
  }

  if (action === 'view') {
    xpGain = 1
    updates.total_views = (member.total_views || 0) + 1
  }

  if (xpGain > 0) {
    const newXp = (member.total_xp || 0) + xpGain
    const newLevel = calcLevel(newXp)
    updates.total_xp = newXp
    updates.level = newLevel
    await supabase.from('members').update(updates).eq('id', member_id)
  } else if (Object.keys(updates).length > 0) {
    await supabase.from('members').update(updates).eq('id', member_id)
  }

  const { data: updatedMember } = await supabase.from('members').select('*').eq('id', member_id).single()
  const accountAgeDays = Math.floor((Date.now() - new Date(updatedMember.joined_at).getTime()) / 86400000)
  const newAchievements = await checkAchievements(member_id, { ...updatedMember, account_age_days: accountAgeDays })

  res.json({ xp: updatedMember.total_xp, level: updatedMember.level, xpGain, newAchievements })
}
