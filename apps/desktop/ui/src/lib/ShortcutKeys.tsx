import { Kbd } from "@ixos/ui";
import { useEffect, useState } from "react";
import { getShortcut, type ShortcutConfig } from "./api";

const LABELS: Record<string, string> = { Control: "Ctrl", Meta: "Win" };
const TRIED_KEY = "ixos.quickSearchTried";

/** The quick search shortcut as keycaps, for example Ctrl Space. */
export function ShortcutKeys() {
  const [shortcut, setShortcut] = useState<ShortcutConfig | null>(null);
  useEffect(() => {
    getShortcut().then(setShortcut, () => {});
  }, []);
  if (!shortcut) return null;
  return (
    <span className="shortcut-keys">
      {[...shortcut.modifiers.map((modifier) => LABELS[modifier] ?? modifier), shortcut.key].map((part) => (
        <Kbd key={part}>{part}</Kbd>
      ))}
    </span>
  );
}

/** Quick search records its first use, so the main window can stop suggesting it. */
export function markQuickSearchTried() {
  try {
    localStorage.setItem(TRIED_KEY, "1");
  } catch {}
}

export function useQuickSearchTried() {
  const read = () => {
    try {
      return localStorage.getItem(TRIED_KEY) === "1";
    } catch {
      return true;
    }
  };
  const [tried, setTried] = useState(read);
  useEffect(() => {
    // Quick search is another window; storage events arrive from it.
    const update = () => setTried(read());
    window.addEventListener("storage", update);
    window.addEventListener("focus", update);
    return () => {
      window.removeEventListener("storage", update);
      window.removeEventListener("focus", update);
    };
  }, []);
  return tried;
}
