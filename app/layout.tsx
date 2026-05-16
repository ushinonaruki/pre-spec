import type { Metadata } from 'next'
import './globals.css'
import { UI_TEXT } from '@/lib/text/uiText'

export const metadata: Metadata = {
  title: 'pre-spec',
  description: UI_TEXT.app.tagline,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className="h-full">
      <body className="h-full">{children}</body>
    </html>
  )
}
