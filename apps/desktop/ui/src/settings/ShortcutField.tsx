import { Kbd } from "@ixos/ui";
import { useEffect, useState } from "react";
import { getShortcut, setShortcut, type ShortcutConfig } from "../lib/api";

const MODIFIERS: [keyof KeyboardEvent, string, string][] = [
  ["ctrlKey", "Control", "Ctrl"],
  ["altKey", "Alt", "Alt"],
  ["shiftKey", "Shift", "Shift"],
  ["metaKey", "Meta", "Win"],
];

/** The key name the backend understands, from a KeyboardEvent code. */
function keyName(code: string): string | null {
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit\d$/.test(code)) return code.slice(5);
  if (/^F\d{1,2}$/.test(code) || ["Space", "Enter", "Tab", "Backspace"].includes(code)) return code;
  const punctuation = ["Comma", "Period", "Slash", "Semicolon", "Quote", "BracketLeft", "BracketRight", "Backslash", "Minus", "Equal", "Backquote"];
  return punctuation.includes(code) ? code : null;
}

const label = (modifier: string) => MODIFIERS.find(([, name]) => name === modifier)?.[2] ?? modifier;

export function ShortcutField() {
  const [shortcut, setCurrent] = useState<ShortcutConfig | null>(null);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    getShortcut().then(setCurrent, () => {});
  }, []);

  useEffect(() => {
    if (!listening) return;
    const capture = (event: KeyboardEvent) => {
      event.preventDefault();
      if (event.code === "Escape") return setListening(false);
      const key = keyName(event.code);
      const modifiers = MODIFIERS.filter(([flag]) => event[flag]).map(([, name]) => name);
      if (!key || !modifiers.length) return;
      const next = { modifiers, key };
      setListening(false);
      setShortcut(next).then(
        () => {
          setCurrent(next);
          setError(null);
        },
        (reason) => setError(String(reason)),
      );
    };
    window.addEventListener("keydown", capture, true);
    return () => window.removeEventListener("keydown", capture, true);
  }, [listening]);

  return (
    <span className="shortcut">
      {error && <span className="status--error">{error}</span>}
      <button className={`shortcut-field${listening ? " is-listening" : ""}`} onClick={() => setListening(!listening)}>
        {listening ? (
          "Press the new keys"
        ) : shortcut ? (
          [...shortcut.modifiers.map(label), shortcut.key].map((part) => <Kbd key={part}>{part}</Kbd>)
        ) : (
          "…"
        )}
      </button>
    </span>
  );
}
