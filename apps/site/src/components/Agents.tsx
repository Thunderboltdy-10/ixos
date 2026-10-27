"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useReducedMotion } from "framer-motion";
import { EXCHANGE } from "@/lib/agent";
import { Copy } from "./Copy";
import { Reveal, Stage, useShown, useActiveDemo } from "./Stage";
import { DesktopOption, detect, noChange } from "./Install";
import { installCommand } from "@/lib/install";

export function Agents() {
  const system = useSyncExternalStore(noChange, detect, () => null);
  const [desktop, setDesktop] = useState(true);
  const command = installCommand(system === "mac" || system === "linux" ? "unix" : "windows", desktop);
  const engine = system === "mac" || system === "linux" ? '"$HOME/.ixos/bin/ixos"' : '"$env:USERPROFILE/.ixos/bin/ixos.exe"';
  const project = system === "mac" || system === "linux" ? "/your/project" : "C:/your/project";
  const commands = [
    { name: "Claude Code", command: `claude mcp add --transport stdio ixos -- ${engine} mcp --dir "${project}" --profile code` },
    { name: "Codex", command: `codex mcp add ixos -- ${engine} mcp --dir "${project}" --profile code` },
  ];
  return (
    <section id="agents" tabIndex={-1} className="section section--split agents">
      <div className="section-text">
        <Reveal>
          <h2>Give it to your agent.</h2>
        </Reveal>
        <Reveal delay={0.08}>
          <p className="lede">
            Add Ixos as an MCP server and your agent can search, grep and read with exact line numbers. Answers stay
            under 6 KB, so they don&apos;t fill up its context.
          </p>
        </Reveal>
        <Reveal delay={0.16} className="commands">
          <div className="command">
            <div className="command-head"><span>1. Install once · {system === "mac" || system === "linux" ? "macOS / Linux" : "PowerShell"}</span><Copy text={command} label="Copy installation command" /></div>
            <DesktopOption checked={desktop} onChange={setDesktop} />
            <code>{command}</code>
            <p className="aside">Includes the CLI, MCP and skill. The commands below use the installed engine directly.</p>
          </div>
          <p className="aside">2. Register with your agent. Replace the example project path with your own.</p>
          {commands.map(({ name, command }) => (
            <div key={name} className="command">
              <div className="command-head">
                <span>{name}</span>
                <Copy text={command} label={`Copy the ${name} command`} />
              </div>
              <code>{command}</code>
            </div>
          ))}
          <p className="aside">
            Any MCP client works. <Link href="/docs#agents">Setup for other agents</Link>
          </p>
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
