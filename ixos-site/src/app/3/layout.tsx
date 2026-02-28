import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Ixos — Find anything, instantly',
  description:
    'On-device semantic search that processes 1,000 files in milliseconds. No cloud, no telemetry.',
}

export default function Layout3({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Cabinet Grotesk + Space Mono for The Wire */}
      <link
        href="https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@700,800,900&display=swap"
        rel="stylesheet"
      />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap"
        rel="stylesheet"
      />
      {children}
    </>
  )
}
