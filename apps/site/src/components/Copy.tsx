"use client";

import { CheckIcon, CopyIcon } from "@ixos/ui";
import { useState } from "react";
import type { ReactNode } from "react";

export function Copy({ text, label = "Copy command", className = "copy", children = "Copy" }: { text: string; label?: string; className?: string; children?: ReactNode }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className={className}
      aria-label={label}
      onClick={() =>
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1400);
        })
      }
    >
      {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
      {copied ? "Copied" : children}
    </button>
  );
}
