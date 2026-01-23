import { useState, useRef, useEffect } from 'react';

export function useMagneticCursor(isActive: boolean = true) {
    const elementRef = useRef<HTMLElement>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });

    useEffect(() => {
        if (!isActive || !elementRef.current) return;

        const element = elementRef.current;

        const handleMouseMove = (e: MouseEvent) => {
            const { clientX, clientY } = e;
            const { left, top, width, height } = element.getBoundingClientRect();
            const centerX = left + width / 2;
            const centerY = top + height / 2;

            const distanceX = clientX - centerX;
            const distanceY = clientY - centerY;

            const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
            const maxDistance = Math.max(width, height) * 2; // Attraction radius

            if (distance < maxDistance) {
                const power = 1 - distance / maxDistance;
                setPosition({
                    x: distanceX * power * 0.3,
                    y: distanceY * power * 0.3
                });
            } else {
                setPosition({ x: 0, y: 0 });
            }
        };

        const handleMouseLeave = () => {
            setPosition({ x: 0, y: 0 });
        };

        window.addEventListener('mousemove', handleMouseMove);
        element.addEventListener('mouseleave', handleMouseLeave);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            element.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, [isActive]);

    return { elementRef, position };
}
