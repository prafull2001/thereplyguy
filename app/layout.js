import './globals.css'

export const metadata = {
  title: 'ReplyGuy',
  description: 'Track your daily Twitter replies and follower growth',
  icons: {
    icon: '/replyguylogo.png',
    shortcut: '/replyguylogo.png',
    apple: '/replyguylogo.png',
  },
  other: {
    'cache-control': 'no-cache, no-store, must-revalidate',
    'pragma': 'no-cache',
    'expires': '0'
  }
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('SW registered: ', registration);
                      // Check for updates every 30 seconds
                      setInterval(() => {
                        registration.update();
                      }, 30000);
                    })
                    .catch(function(registrationError) {
                      console.log('SW registration failed: ', registrationError);
                    });
                });
              }
            `,
          }}
        />
      </head>
      <body className="min-h-screen" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        <div className="container mx-auto px-6 py-12 max-w-7xl">
          {children}
        </div>
      </body>
    </html>
  )
}