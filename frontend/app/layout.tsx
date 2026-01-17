import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'NHL Score Predictor - War Room',
  description: 'Interactive NHL game prediction and simulation dashboard',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
