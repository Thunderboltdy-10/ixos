import { useRef } from 'react';
import { useScroll, useTransform, useSpring } from 'framer-motion';

export function useSectionReveal(threshold = 0.2) {
    const ref = useRef(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start end", "end start"]
    });

    const opacity = useTransform(scrollYProgress, [0, threshold], [0, 1]);
    const y = useTransform(scrollYProgress, [0, threshold], [50, 0]);

    // Add mild spring physics for smoother feeling
    const springY = useSpring(y, { stiffness: 100, damping: 20 });
    const springOpacity = useSpring(opacity, { stiffness: 100, damping: 20 });

    return { ref, style: { opacity: springOpacity, y: springY } };
}
