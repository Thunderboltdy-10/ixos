"use client";

import Image from "next/image";

/**
 * HalftoneStrip - Section divider using Strip Divider.png
 * Creates a premium halftone divider between sections
 */

interface HalftoneStripProps {
  opacity?: number;
  className?: string;
  flip?: boolean;
}

export function HalftoneStrip({
  opacity = 0.1,
  className = "",
  flip = false
}: HalftoneStripProps) {
  return (
    <div
      className={`relative w-full h-8 overflow-hidden ${className}`}
      aria-hidden="true"
    >
      <Image
        src="/Strip Divider.png"
        alt=""
        fill
        className="object-cover"
        style={{
          opacity,
          transform: flip ? 'scaleY(-1)' : 'none',
        }}
      />
    </div>
  );
}

/**
 * CSS-only halftone pattern fallback
 * Use this if the image is not available
 */
export function HalftoneStripCSS({
  opacity = 0.08,
  className = ""
}: Omit<HalftoneStripProps, 'flip'>) {
  return (
    <div
      className={`relative w-full h-4 ${className}`}
      style={{
        opacity,
        background: `
          radial-gradient(circle at 2px 2px, rgba(255,255,255,0.3) 1px, transparent 1px)
        `,
        backgroundSize: '8px 8px',
      }}
      aria-hidden="true"
    />
  );
}

export default HalftoneStrip;
