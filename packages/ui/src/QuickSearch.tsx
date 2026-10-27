"use client";

import { useRef, type ReactNode } from "react";
import { CodeView } from "./CodeView";
import { Progress } from "./Progress";
import { ResultRow } from "./ResultRow";
import type { Hit, Passage } from "./types";
import { useFlip } from "./useFlip";

const BAR_HEIGHT = 66;
const ROW_HEIGHT = 56;

interface QuickSearchProps {
  logo: string;
  /** The query field, or plain text with a caret on the website. */
  query: ReactNode;
  scope?: ReactNode;
  /** 0 to 1 while searching; null hides the line. */
  progress: number | null;
  hits: Hit[];
  active: number;
  onActive?: (index: number) => void;
  onOpen?: (index: number) => void;
  passage?: Passage | null;
  empty?: ReactNode;
  status?: ReactNode;
}

/** The quick search panel. The active result's passage opens to its right. */
export function QuickSearch({
  logo,
  query,
  scope,
  progress,
  hits,
  active,
  onActive,
  onOpen,
  passage,
  empty,
  status,
}: QuickSearchProps) {
  const list = useRef<HTMLOListElement>(null);
  useFlip(list, hits.map((hit) => hit.key).join("\n"));
  const open = Boolean(passage) && active >= 0 && active < hits.length;
  return (
    <div className="ix-qs">
      <div className="ix-qs-panel">
        <div className="ix-qs-bar">
          <img src={logo} alt="" width={20} height={20} />
          {query}
          {scope}
        </div>
        <Progress value={progress} />
        {hits.length ? (
          <ol ref={list} className="ix-rows" role="listbox" aria-label="Results">
            {hits.map((hit, index) => (
              <ResultRow
                key={hit.key}
                hit={hit}
                layout="inline"
                selected={index === active}
                onHover={() => onActive?.(index)}
                onSelect={() => onActive?.(index)}
                onOpen={() => onOpen?.(index)}
              />
            ))}
          </ol>
        ) : (
          <div className="ix-qs-empty">{empty}</div>
        )}
        <div className="ix-qs-foot">
          <span>
            <b>↑↓</b> select
          </span>
          <span>
            <b>Enter</b> open
          </span>
          <span>
            <b>Ctrl Enter</b> show in folder
          </span>
          <span>
            <b>Esc</b> close
          </span>
          <span>{status}</span>
        </div>
      </div>
      <aside
        className="ix-side"
        data-open={open}
        aria-hidden={!open}
        style={{ top: BAR_HEIGHT + Math.max(0, active) * ROW_HEIGHT - 8 }}
      >
        {passage && (
          <>
            <div className="ix-side-head">
              <span>{passage.title}</span>
              <span>{passage.detail}</span>
            </div>
            <CodeView lines={passage.lines} from={passage.from} to={passage.to} terms={passage.terms} />
          </>
        )}
      </aside>
    </div>
  );
}
