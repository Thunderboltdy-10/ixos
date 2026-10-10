"use client";

export function EnteringText({ visible }: { visible: boolean }) {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center pointer-events-none z-50"
      style={{
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.5s ease',
      }}
    >
      <div className="flex flex-col items-center gap-3">
        {/* Scan line */}
        <div
          className="w-48 h-px"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(246,185,76,0.4), transparent)',
            opacity: visible ? 1 : 0,
            transition: 'opacity 0.3s ease',
          }}
        />
        <span
          className="font-mono uppercase"
          style={{
            fontSize: 10,
            letterSpacing: '0.6em',
            color: 'rgba(246,185,76,0.55)',
          }}
        >
          entering ixos protocol
        </span>
        <div
          className="w-24 h-px"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(246,185,76,0.25), transparent)',
          }}
        />
      </div>
    </div>
  )
}
