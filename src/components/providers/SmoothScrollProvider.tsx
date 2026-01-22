"use client";

import { ReactLenis } from "lenis/react";

export function SmoothScrollProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    // Phase 1 Stability: Disabled Lenis temporarily
    return <>{children}</>;
    /* 
    return (
        <ReactLenis root options={{ lerp: 0.1, duration: 1.5, smoothWheel: true }}>
            {children}
        </ReactLenis>
    );
    */
}
