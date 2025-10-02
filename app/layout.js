import './globals.css'

export const metadata = {
  title: 'ReplyGuy',
  description: 'Track your daily Twitter replies and follower growth',
  icons: {
    icon: '/replyguylogo.png',
    shortcut: '/replyguylogo.png',
    apple: '/replyguylogo.png',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        <div className="container mx-auto px-6 py-12 max-w-7xl">
          {children}
        </div>
      </body>
    </html>
  )
}