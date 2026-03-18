"use client";

import { useDecodeEffect } from "@/hooks/useDecodeEffect";

export function DecodedHeading({
  text,
  as: Tag = "h2",
  className = "text-4xl md:text-5xl font-bold font-mono",
  delay = 0,
}: {
  text: string;
  as?: "h1" | "h2" | "h3";
  className?: string;
  delay?: number;
}) {
  const { ref, display } = useDecodeEffect(text, delay);
  return (
    <Tag
      ref={ref as React.Ref<HTMLHeadingElement>}
      className={className}
      style={{ letterSpacing: "-0.02em", lineHeight: 1.1 }}
    >
      {display}
    </Tag>
  );
}
