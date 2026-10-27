import { FileIcon } from "./icons";
import { ScoreBar } from "./ScoreBar";
import type { Hit } from "./types";

interface ResultRowProps {
  hit: Hit;
  /** Inline puts the folder beside the name (quick search); stacked puts it below. */
  layout: "inline" | "stacked";
  selected: boolean;
  id?: string;
  onSelect?: () => void;
  onHover?: () => void;
  onOpen?: () => void;
}

export function ResultRow({ hit, layout, selected, id, onSelect, onHover, onOpen }: ResultRowProps) {
  return (
    <li
      id={id}
      role="option"
      aria-selected={selected}
      data-flip={hit.key}
      className={`ix-row ix-row--${layout}`}
      onClick={onSelect}
      onMouseEnter={onHover}
      onDoubleClick={onOpen}
    >
      {layout === "inline" && <FileIcon className="ix-row-icon" />}
      <span className="ix-row-text">
        <span className="ix-row-name">
          {hit.file}
          {layout === "stacked" && hit.lines && <span className="ix-row-lines"> {hit.lines}</span>}
        </span>
        <span className="ix-row-dir">{hit.dir}</span>
      </span>
      <ScoreBar keyword={hit.keyword} meaning={hit.meaning} width={layout === "inline" ? 80 : 88} />
    </li>
  );
}
