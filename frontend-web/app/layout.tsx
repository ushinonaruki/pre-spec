import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'pre-spec',
  description: 'Spec Interview Workbench',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}
