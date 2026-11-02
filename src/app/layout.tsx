import './globals.css'
import React from 'react'
import type { Metadata } from 'next'
import { ApolloWrapper } from '@/lib/apollo/provider'
import Header from '@/components/header'
import Footer from '@/components/footer'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Gene Set Enrichment',
  description: 'Gene set enrichment and search',
  keywords: [
    'bioinformatics',
    'enrichment analysis',
    'gene set library',
    'gene set',
    'genomics',
  ].join(', '),
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode,
}) {
  return (
    <html lang="en" style={{ minWidth: '580px' }}>
      <ApolloWrapper>
          <body className="min-h-screen flex flex-col" data-theme="tripothesis">
            <React.Suspense fallback={null}>
              <Header />
               <main className="flex-1 flex flex-col justify-stretch mx-8 md:mx-32">
                <React.Suspense fallback={<span className="loading loading-ring loading-lg"></span>}>
                  {children}
                </React.Suspense>
              </main>
              <Footer />
            </React.Suspense>
          </body>
      </ApolloWrapper>
    </html>
  )
}
