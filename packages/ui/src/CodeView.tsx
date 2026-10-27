import { Fragment, type Ref } from "react";
import type { SourceLine } from "./types";

const STOP = new Set(
  "a an and are as at be by can do for from how in is it my of on or that the this to was what when where which who why with".split(" "),
);

/** Words from a query worth marking in source text. */
export function queryTerms(query: string): string[] {
  return [...new Set(query.toLowerCase().match(/[\p{L}\p{N}_]{3,}/gu) ?? [])].filter(
    (term) => !STOP.has(term),
  );
}

function marked(text: string, terms: string[]) {
  if (!terms.length || !text) return text || " ";
  // Terms are letters, digits and underscores, so they need no escaping.
  const parts = text.split(new RegExp(`(${terms.join("|")})`, "gi"));
  return parts.map((part, index) =>
    index % 2 ? <mark key={index}>{part}</mark> : <Fragment key={index}>{part}</Fragment>,
  );
}

interface CodeViewProps {
  lines: SourceLine[];
  from: number;
  to: number;
  terms?: string[];
  /** Attached to the first line of the passage so callers can scroll to it. */
  hitRef?: Ref<HTMLSpanElement>;
}

export function CodeView({ lines, from, to, terms = [], hitRef }: CodeViewProps) {
  return (
    <pre className="ix-code">
      {lines.map(({ n, text }) => {
        const hit = n >= from && n <= to;
        const comment = /^\s*(\/\/|#|--|\/\*|\*)/.test(text);
        return (
          <span
            key={n}
            ref={n === from ? hitRef : undefined}
            className={`ix-code-line${hit ? " is-hit" : ""}${comment ? " is-comment" : ""}`}
          >
            <b>{n}</b>
            <span>{marked(text, terms)}</span>
          </span>
        );
      })}
    </pre>
  );
}
