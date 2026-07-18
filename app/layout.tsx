import { TrpcProvider } from '@/lib/trpc/provider';
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from 'sonner'
import { QueryProvider } from '@/providers/query-provider'
import { AuthProvider } from '@/features/auth/context/auth-context'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Stock Apple',
  description: 'Manejo de Stock de Productos Apple',
  icons: {
    icon: '/logo.svg',
    apple: '/logo.svg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className="dark">
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.getRegistrations().then(function(registrations) {
                for (let registration of registrations) {
                  registration.unregister();
                }
              });
            }
          `
        }} />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <QueryProvider>
          <AuthProvider>
            <TrpcProvider>{children}</TrpcProvider>
            <Toaster
              theme="dark"
              position="top-right"
              toastOptions={{
                style: {
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  color: 'hsl(var(--foreground))',
                },
              }}
            />
          </AuthProvider>
        </QueryProvider>
        <Analytics />
      </body>
    </html>
  )
}
