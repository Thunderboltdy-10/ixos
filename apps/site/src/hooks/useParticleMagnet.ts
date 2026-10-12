import { useEffect, RefObject } from "react";

export function useParticleMagnet(
    elementRef: RefObject<HTMLElement | null>
) {
    useEffect(() => {
        const element = elementRef.current;
        if (!element) return;

        // We'll dispatch a custom event that ParticlesField listens to
        // This decouples the button from the canvas logic

        const handleMouseEnter = () => {
            const rect = element.getBoundingClientRect();
            const center = {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
            };

            // Dispatch event for magnet active
            // Since we don't have a global event bus, we use window
            // Note: You might need to add this event listener in ParticlesField.tsx
            window.dispatchEvent(new CustomEvent('particle-magnet-start', {
                detail: { x: center.x, y: center.y }
            }));
        };

        const handleMouseLeave = () => {
            window.dispatchEvent(new CustomEvent('particle-magnet-end'));
        };

        element.addEventListener('mouseenter', handleMouseEnter);
        element.addEventListener('mouseleave', handleMouseLeave);

        return () => {
            element.removeEventListener('mouseenter', handleMouseEnter);
            element.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, [elementRef]);
}
