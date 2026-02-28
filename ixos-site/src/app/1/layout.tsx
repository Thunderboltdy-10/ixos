import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Ixos — Search that converges',
  description:
    'Local-first semantic file search. Progressive retrieval, hybrid intelligence, entirely on-device.',
}

export default function Layout1({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Instrument Sans + JetBrains Mono for Mission Control */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700;900&family=JetBrains+Mono:wght@400;500;600&display=swap"
        rel="stylesheet"
      />
      {children}
    </>
  )
}
