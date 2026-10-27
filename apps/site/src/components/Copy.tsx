"use client";

import { CheckIcon, CopyIcon } from "@ixos/ui";
import { useState } from "react";

export function Copy({ text, label = "Copy command" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="copy"
      aria-label={label}
      onClick={() =>
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1400);
        })
      }
    >
      {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
