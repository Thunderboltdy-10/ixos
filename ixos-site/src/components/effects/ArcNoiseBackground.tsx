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
        data[i + 3] = 18; // low alpha for subtle grain
    }
    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL("image/png");
}

function isGecko(): boolean {
    if (typeof navigator === "undefined") return false;
    const ua = navigator.userAgent;
    return /Gecko\/\d/.test(ua) && !/like Gecko/.test(ua);
}

export function ArcNoiseBackground() {
    const [canvasNoise, setCanvasNoise] = useState<string | null>(null);
    const [gecko, setGecko] = useState(false);

    useEffect(() => {
        setGecko(isGecko());
        setCanvasNoise(generateCanvasNoiseDataURL());
    }, []);

    return (
        <div className="absolute inset-0 z-0 pointer-events-none opacity-40 mix-blend-overlay">
            {/* SVG feTurbulence - skip on Firefox where it renders differently */}
            {!gecko && (
                <svg
                    className="w-full h-full opacity-100"
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
            )}

            {/* Canvas-based noise tile - primary on Firefox, supplementary on others */}
            {canvasNoise && (
                <div
                    className="absolute inset-0"
                    style={{
                        backgroundImage: `url(${canvasNoise})`,
                        backgroundSize: "200px 200px",
                        backgroundRepeat: "repeat",
                    }}
                />
            )}
        </div>
    );
}
