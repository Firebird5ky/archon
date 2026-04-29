import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ARCHON',
  description: 'The faction network',
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
