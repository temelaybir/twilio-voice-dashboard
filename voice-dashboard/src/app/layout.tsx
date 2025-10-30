import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter'
})

export const metadata: Metadata = {
  title: 'Twilio Voice Dashboard - Happy Smile Clinics',
  description: 'Gerçek zamanlı çağrı izleme ve yönetim sistemi',
  keywords: ['twilio', 'voice', 'dashboard', 'çağrı izleme', 'telefon sistemi'],
  authors: [{ name: 'Happy Smile Clinics' }],
  viewport: 'width=device-width, initial-scale=1',
  robots: 'noindex, nofollow',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body 
        className={`${inter.variable} font-sans antialiased min-h-screen bg-gradient-to-br from-slate-50 to-slate-100`}
        suppressHydrationWarning
      >
        <div className="relative min-h-screen">
          <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" />
          
          <main className="relative z-10">
            {children}
          </main>
          
          <footer className="relative z-10 border-t bg-white/80 backdrop-blur-sm">
            <div className="container mx-auto px-4 py-6">
              <div className="flex flex-col md:flex-row items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">HS</span>
                    </div>
                    <span className="font-semibold text-gray-900">Happy Smile Clinics</span>
                  </div>
                  <span className="text-gray-500">Voice Dashboard</span>
                </div>
                
                <div className="flex items-center space-x-6 mt-4 md:mt-0">
                  <div className="text-sm text-gray-500">
                    Powered by Twilio Studio
                  </div>
                  <div className="text-xs text-gray-400">
                    v1.0.0
                  </div>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
} 