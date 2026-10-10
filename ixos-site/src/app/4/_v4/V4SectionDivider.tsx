"use client";

export function V4SectionDivider({ accent = 'dim' }: { accent?: 'cyan' | 'violet' | 'amber' | 'dim' }) {
  const colors = {
    cyan:   'rgba(45,212,191,0.22)',
    violet: 'rgba(124,58,237,0.15)',
    amber:  'rgba(245,158,11,0.15)',
    dim:    'rgba(255,255,255,0.04)',
  }
  return (
    <div style={{ position: 'relative', height: '1px', overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(90deg, transparent, ${colors[accent]}, transparent)`,
        }}
      />
    </div>
  )
}
