"use client"

export function GridBackground() {
  return (
    <>
      <style>{`
        @keyframes grid-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 1.5; }
        }
        .grid-bg {
          animation: grid-pulse 4s ease-in-out infinite;
        }
      `}</style>
      <div
        className="grid-bg fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundColor: '#0A0D0F',
          backgroundImage: `
            linear-gradient(rgba(246, 185, 76, 0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(246, 185, 76, 0.04) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
      />
    </>
  )
}
