"use client";

import { useEffect, useState } from "react";

function generateCanvasNoiseDataURL(): string {
    const size = 200;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        const v = Math.random() * 255;
        data[i] = v;
        data[i + 1] = v;
        data[i + 2] = v;
        data[i + 3] = 16; // low alpha for subtle grain
    }
    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL("image/png");
}

export function ArcNoiseBackground() {
    const [canvasNoise, setCanvasNoise] = useState<string | null>(null);

    useEffect(() => {
        setCanvasNoise(generateCanvasNoiseDataURL());
    }, []);

    return (
        <div
            className="absolute inset-0 z-[1] pointer-events-none"
            style={{
                opacity: 0.22,
                mixBlendMode: "overlay",
            }}
        >
            <svg
                className="w-full h-full"
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="none"
            >
                <filter id="denseNoise" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
                    <feTurbulence
                        type="fractalNoise"
                        baseFrequency="0.85"
                        numOctaves="4"
                        stitchTiles="stitch"
                    />
                    <feColorMatrix
                        type="matrix"
                        values="1 0 0 0 0
                        0 1 0 0 0
                        0 0 1 0 0
                        0 0 0 1 0"
                    />
                </filter>
                <rect width="100%" height="100%" filter="url(#denseNoise)" />
            </svg>

            {/* Canvas-based grain tile for consistent browser output (including Firefox). */}
            {canvasNoise && (
                <div
                    className="absolute inset-0"
                    style={{
                        backgroundImage: `url(${canvasNoise})`,
                        backgroundSize: "200px 200px",
                        backgroundRepeat: "repeat",
                        opacity: 0.46,
                    }}
                />
            )}
        </div>
    );
}
