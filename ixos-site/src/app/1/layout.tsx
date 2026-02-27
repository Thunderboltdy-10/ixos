import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Ixos — Search that converges',
  description:
    'Local-first semantic file search. Progressive retrieval, hybrid intelligence, entirely on-device.',
}

export default function Layout1({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
