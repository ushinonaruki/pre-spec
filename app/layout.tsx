import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'pre-spec',
  description: 'LDD Interview Workbench',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className="h-full">
      <body className="h-full">{children}</body>
    </html>
  )
}
