"use client";

import { useEffect, useState } from "react";
import Page1 from "./1/page";
import Page2 from "./2/page";
import Page3 from "./3/page";
import Page4 from "./4/page";
import Page5 from "./5/page";

export default function RootPage() {
  const [variant, setVariant] = useState<number | null>(null);

  useEffect(() => {
    // Pick a random variant on every load so reloading shows a different design
    const page = Math.floor(Math.random() * 5) + 1;
    sessionStorage.setItem('ixos_variant', String(page));
    setVariant(page);
  }, []);

  if (variant === null) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "#050507",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        aria-hidden
      >
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#F6B94C",
            opacity: 0.6,
          }}
        />
      </div>
    );
  }

  switch (variant) {
    case 1: return <Page1 />;
    case 2: return <Page2 />;
    case 3: return <Page3 />;
    case 4: return <Page4 />;
    case 5: return <Page5 />;
    default: return <Page5 />;
  }
}
