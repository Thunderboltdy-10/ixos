"use client";

import { useEffect, useRef, useState } from "react";
import { DemoSurface } from "@/landing/DemoSurface";
import type { SearchMode } from "@/landing/DemoSurface";

interface ScaledDemoContainerProps {
  naturalWidth?: number;
  naturalHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  minScale?: number;
  className?: string;
  style?: React.CSSProperties;
  borderColor?: string;
  glowColor?: string;
  children?: (scale: number) => React.ReactNode;
}

export function ScaledDemoContainer({
  naturalWidth = 1200,
  naturalHeight = 800,
  maxWidth,
  maxHeight,
  minScale = 0.3,
  className = "",
  style = {},
  borderColor = "rgba(246,185,76,0.12)",
  glowColor = "rgba(246,185,76,0.06)",
  children,
}: ScaledDemoContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      const availableWidth = maxWidth ?? containerRect.width;
      const availableHeight = maxHeight ?? containerRect.height;
      
      const scaleX = availableWidth / naturalWidth;
      const scaleY = availableHeight / naturalHeight;
      
      const newScale = Math.min(Math.max(Math.min(scaleX, scaleY), minScale), 1);
      
      setScale(newScale);
      setDimensions({
        width: naturalWidth * newScale,
        height: naturalHeight * newScale,
      });
    };

    updateScale();
    
    const resizeObserver = new ResizeObserver(updateScale);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    return () => resizeObserver.disconnect();
  }, [naturalWidth, naturalHeight, maxWidth, maxHeight, minScale]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        ...style,
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {dimensions.width > 0 && dimensions.height > 0 && (
        <div
          style={{
            position: "relative",
            width: dimensions.width,
            height: dimensions.height,
            borderRadius: 12,
            overflow: "hidden",
            border: `1px solid ${borderColor}`,
            boxShadow: `0 0 0 1px rgba(255,255,255,0.04), 0 32px 80px rgba(0,0,0,0.7), 0 0 60px ${glowColor}`,
            background: "rgba(14,17,23,0.9)",
            backdropFilter: "blur(4px)",
          }}
        >
          {children?.(scale)}
        </div>
      )}
    </div>
  );
}

interface DemoWindowChromeProps {
  title?: string;
  scale: number;
  chromeHeight?: number;
}

export function DemoWindowChrome({
  title = "IXOS DESKTOP",
  scale,
  chromeHeight = 32,
}: DemoWindowChromeProps) {
  const scaledChromeHeight = chromeHeight * scale;
  
  return (
    <>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: scaledChromeHeight,
          background: "rgba(10,12,16,0.95)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          display: "flex",
          alignItems: "center",
          gap: 6 * scale,
          padding: `0 ${12 * scale}px`,
          zIndex: 20,
        }}
      >
        <div style={{ width: 10 * scale, height: 10 * scale, borderRadius: "50%", backgroundColor: "rgba(255,95,87,0.7)" }} />
        <div style={{ width: 10 * scale, height: 10 * scale, borderRadius: "50%", backgroundColor: "rgba(255,189,68,0.7)" }} />
        <div style={{ width: 10 * scale, height: 10 * scale, borderRadius: "50%", backgroundColor: "rgba(40,201,64,0.7)" }} />
        <div style={{ flex: 1, textAlign: "center" }}>
          <span style={{ fontFamily: "monospace", fontSize: 9 * scale, color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em" }}>
            {title}
          </span>
        </div>
      </div>
    </>
  );
}

interface HeroDemoProps {
  initialQuery?: string;
  initialMode?: string;
  autoRun?: boolean;
  presets?: string[];
  maxHeight?: number;
  title?: string;
}

export function HeroDemo({
  initialQuery = "authentication token refresh",
  initialMode = "auto",
  autoRun = true,
  presets,
  maxHeight,
  title = "IXOS DESKTOP — COMMAND CENTER",
}: HeroDemoProps) {
  const NATURAL_W = 1200;
  const NATURAL_H = 780;
  const CHROME_H = 32;
  
  return (
    <ScaledDemoContainer
      naturalWidth={NATURAL_W}
      naturalHeight={NATURAL_H}
      maxHeight={maxHeight}
      minScale={0.4}
    >
      {(scale) => (
        <>
          <DemoWindowChrome title={title} scale={scale} chromeHeight={CHROME_H} />
          <div
            style={{
              position: "absolute",
              top: CHROME_H * scale,
              left: 0,
              width: NATURAL_W * scale,
              height: (NATURAL_H - CHROME_H) * scale,
              transformOrigin: "top left",
              transform: `scale(${scale})`,
            }}
          >
            <DemoSurface
              initialQuery={initialQuery}
              initialMode={initialMode as SearchMode}
              autoRun={autoRun}
              presets={presets}
              style={{ width: NATURAL_W, height: NATURAL_H - CHROME_H }}
            />
          </div>
          {/* Amber glow edge top */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 2,
              background: "linear-gradient(90deg, transparent, rgba(246,185,76,0.5) 40%, rgba(20,184,166,0.4) 60%, transparent)",
              zIndex: 15,
            }}
          />
        </>
      )}
    </ScaledDemoContainer>
  );
}
