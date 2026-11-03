"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { EXCHANGE } from "@/lib/agent";
import { Reveal, Stage, useShown, useActiveDemo, useReducedMotion } from "./Stage";
import { Code } from "./Code";
import { RELEASES } from "@/lib/github";

const PROMPT = `Install Ixos on this computer from ${RELEASES}/latest and open it once. It gives you local search of my code and documents by meaning, through the MCP tools search, grep and read. Tell me when to restart you so they load.`;

export function Agents() {
  return (
    <section id="agents" tabIndex={-1} className="section section--split agents">
      <div className="section-text">
        <Reveal>
          <h2>Give it to your agent.</h2>
        </Reveal>
        <Reveal delay={0.08}>
          <p className="lede">
            Your agent can search, grep and read with exact line numbers through Ixos. Answers stay
            under 6 KB, so they don&apos;t fill up its context.
          </p>
        </Reveal>
        <Reveal delay={0.16} className="commands">
          <Code label="Paste this to your agent">{PROMPT}</Code>
          <p className="aside">Other MCP clients can use <code>ixos mcp</code>. <Link href="/docs#agents">Read the docs</Link></p>
        </Reveal>
      </div>
      <Stage>
        <Terminal />
      </Stage>
    </section>
  );
}

const LINES = EXCHANGE.flatMap((call) => [
  { kind: "call", text: `${call.tool} ${call.args}` },
  ...call.output.split("\n").map((text) => ({ kind: "out", text })),
  { kind: "size", text: `${call.bytes} bytes` },
]);

/** A recorded search and read, played back line by line. */
function Terminal() {
  const shown = useShown();
  const active = useActiveDemo();
  const still = useReducedMotion();
  const [played, setPlayed] = useState(0);
  const cursor = useRef(0);
  const count = still ? LINES.length : played;

  useEffect(() => {
    if (!shown || !active || still || cursor.current >= LINES.length) return;
    let line = cursor.current;
    let timer = 0;
    const next = () => {
      line += 1;
      cursor.current = line;
      setPlayed(line);
      if (line >= LINES.length) return;
      const kind = LINES[line].kind;
      timer = window.setTimeout(next, kind === "call" ? 900 : kind === "size" ? 260 : 45);
    };
    timer = window.setTimeout(next, 900);
    return () => window.clearTimeout(timer);
  }, [shown, active, still]);

  return (
    <div className="panel terminal" aria-label="An agent searching with Ixos">
      <div className="terminal-head">
        <span />
        <span />
        <span />
        ixos mcp --dir crates
      </div>
      <pre className="terminal-body">
        {LINES.slice(0, count).map((line, index) => (
          <span key={index} className={`terminal-${line.kind}`}>
            {line.text}
          </span>
        ))}
        {count < LINES.length && <span className="ix-caret" />}
      </pre>
    </div>
  );
}
