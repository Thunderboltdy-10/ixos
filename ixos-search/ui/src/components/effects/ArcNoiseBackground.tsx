import { useEffect, useState } from 'react';

function buildNoiseTile(): string {
  const size = 180;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const imageData = ctx.createImageData(size, size);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const value = Math.random() * 255;
    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
    data[i + 3] = 10;
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

export function ArcNoiseBackground() {
  const [noiseUrl, setNoiseUrl] = useState<string | null>(null);

  useEffect(() => {
    setNoiseUrl(buildNoiseTile());
  }, []);

  return (
    <div
      className="absolute inset-0 z-[1] pointer-events-none"
      style={{ opacity: 0.13, mixBlendMode: 'overlay' }}
    >
      <svg
        className="h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <filter id="desktopArcNoise" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="3" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#desktopArcNoise)" />
      </svg>
      {noiseUrl && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${noiseUrl})`,
            backgroundSize: '180px 180px',
            backgroundRepeat: 'repeat',
            opacity: 0.28,
          }}
        />
      )}
    </div>
  );
}
