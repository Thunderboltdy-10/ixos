"use client";

import { useEffect, useState } from "react";

function generateCanvasNoiseDataURL(): string {
    const size = 256;
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
        data[i + 3] = 14; // very subtle grain
    }
    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL("image/png");
}

export function ArcNoiseBackground({ intensity = 1.0 }: { intensity?: number }) {
    const [canvasNoise, setCanvasNoise] = useState<string | null>(null);

    useEffect(() => {
        setCanvasNoise(generateCanvasNoiseDataURL());
    }, []);

    if (!canvasNoise) return null;

    return (
        <div
            className="absolute inset-0 z-[1] pointer-events-none"
            style={{
                backgroundImage: `url(${canvasNoise})`,
                backgroundSize: "256px 256px",
                backgroundRepeat: "repeat",
                opacity: 0.18 * intensity,
                mixBlendMode: "overlay",
            }}
        />
    );
}

