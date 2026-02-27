import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Ixos — Precision local search',
  description:
    'Local-first semantic file search. Calibrated retrieval, zero egress, entirely on your device.',
}

export default function Layout3({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
