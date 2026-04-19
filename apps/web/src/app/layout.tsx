import type { Metadata } from 'next'
import Script from 'next/script'
import { RootShell } from '@/components/RootShell'
import './globals.css'

export const metadata: Metadata = {
  title: 'SkillHive Marketplace',
  description: 'Discover, call, and earn from AI skills on Solana',
  icons: {
    icon: '/favicon.png',
    apple: '/apple-touch-icon.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID

  return (
    <html suppressHydrationWarning>
      <head>
        {gaId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaId}');
              `}
            </Script>
          </>
        )}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <style>{`
          :root {
            --font-heading: 'Space Grotesk', system-ui, sans-serif;
            --font-body: 'Inter', system-ui, sans-serif;
          }
        `}</style>
      </head>
      <body suppressHydrationWarning className="antialiased">
        <RootShell>{children}</RootShell>
      </body>
    </html>
  )
}
