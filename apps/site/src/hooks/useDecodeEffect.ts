"use client";
import { useEffect, useRef, useState } from "react";

const CHARS = "█░▓▒#@!?$%&*0123456789ABCDEF";

export function useDecodeEffect(text: string, delay = 0) {
  const [display, setDisplay] = useState(text);
  const [revealed, setRevealed] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const scrambled = text
      .split("")
      .map(() => CHARS[Math.floor(Math.random() * CHARS.length)])
      .join("");
    setDisplay(scrambled);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || revealed) return;
        setRevealed(true);
        observer.disconnect();

        setTimeout(() => {
          const chars = text.split("");
          let index = 0;
          const interval = setInterval(() => {
            if (index >= chars.length) {
              clearInterval(interval);
              setDisplay(text);
              return;
            }
            setDisplay((prev) => {
              const arr = prev.split("");
              arr[index] = chars[index];
              return arr.join("");
            });
            index++;
          }, 18);
        }, delay);
      },
      { threshold: 0.3 },
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [text, delay, revealed]);

  return { ref, display };
}
