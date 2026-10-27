import { Kbd, PreviewPane, queryTerms, type SourceLine } from "@ixos/ui";
import { useEffect, useRef, useState } from "react";
import { openFile, readPreview, showInFolder, type Result } from "../lib/api";
import { snippetLines } from "../lib/hits";

interface PreviewProps {
  result: Result;
  folder: string;
  query: string;
}

/** The file around the matched passage, scrolled so the passage is in view. */
export function Preview({ result, folder, query }: PreviewProps) {
  const [lines, setLines] = useState<SourceLine[]>(() => snippetLines(result));
  const hit = useRef<HTMLSpanElement>(null);
  const from = result.snippet?.start_line ?? 1;
  const to = result.snippet?.end_line ?? 1;

  useEffect(() => {
    let live = true;
    const start = Math.max(1, from - 60);
    const timer = window.setTimeout(() => {
      readPreview(result.path, start, 240).then(
        (read) => {
          if (!live) return;
          setLines(snippetLines(read));
        },
        () => {},
      );
    }, 80);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [result, from]);

  useEffect(() => {
    hit.current?.scrollIntoView({ block: "center" });
  }, [lines]);

  return (
    <PreviewPane
      name={result.filename}
      folder={folder}
      lines={lines}
      from={from}
      to={to}
      terms={queryTerms(query)}
      hitRef={hit}
      actions={
        <>
          <button className="ix-button ix-button--primary" onClick={() => openFile(result.path)}>
            Open <Kbd>Enter</Kbd>
          </button>
          <button className="ix-button" onClick={() => showInFolder(result.path)}>
            Show in folder <Kbd>Ctrl</Kbd>
            <Kbd>Enter</Kbd>
          </button>
        </>
      }
    />
  );
}
