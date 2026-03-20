"use client"

export function GridBackground() {
  return (
    <>
      <style>{`
        @keyframes ambient-grid-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 1.4; }
        }
        @keyframes grid-scroll-down {
          0% { transform: translateY(0px); }
          100% { transform: translateY(48px); }
        }
        .ambient-grid-bg {
          animation: ambient-grid-pulse 8s ease-in-out infinite,
                     grid-scroll-down 15s linear infinite;
        }
      `}</style>
      <div
        className="ambient-grid-bg fixed pointer-events-none"
        style={{
          zIndex: 0,
          top: -48,
          left: 0,
          right: 0,
          bottom: -48,
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
