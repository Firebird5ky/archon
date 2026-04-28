// @ts-nocheck
import { NextApiRequest, NextApiResponse } from 'next'
import bcrypt from 'bcryptjs'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const { password, hash } = req.body
  const match = await bcrypt.compare(password, hash)
  res.json({ match })
}
