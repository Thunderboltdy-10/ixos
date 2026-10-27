import type { ReactNode } from "react";
import { SearchIcon } from "./icons";
import { Progress } from "./Progress";

interface QueryBarProps {
  /** The query field, or plain text with a caret on the website. */
  input: ReactNode;
  pickers?: ReactNode;
  progress: number | null;
  busy?: boolean;
}

/** The main window's search field, with its pickers and progress line. */
export function QueryBar({ input, pickers, progress, busy }: QueryBarProps) {
  return (
    <div className="ix-query">
      <div className="ix-query-row">
        <SearchIcon size={19} className="ix-query-icon" />
        {input}
        {pickers && <div className="ix-pickers">{pickers}</div>}
      </div>
      <Progress value={progress} busy={busy} />
    </div>
  );
}
