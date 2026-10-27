import type { ReactNode, Ref } from "react";
import { CodeView } from "./CodeView";
import type { SourceLine } from "./types";

/** Documents wrap like text; code keeps its lines. */
const PROSE = /\.(docx?|epub|md|odt|pdf|pptx?|rtf|tex|txt)$/i;

interface PreviewPaneProps {
  name: string;
  folder: string;
  lines: SourceLine[];
  from: number;
  to: number;
  terms?: string[];
  hitRef?: Ref<HTMLSpanElement>;
  actions?: ReactNode;
}

/** The selected file beside the results, with the matched passage marked. */
export function PreviewPane({ name, folder, lines, from, to, terms, hitRef, actions }: PreviewPaneProps) {
  return (
    <section className="ix-preview" aria-label="Preview">
      <div className="ix-preview-head">
        <span className="ix-preview-name">{name}</span>
        <span className="ix-preview-path">{folder}</span>
      </div>
      <div className={`ix-preview-body${PROSE.test(name) ? " ix-preview-body--prose" : ""}`}>
        <CodeView lines={lines} from={from} to={to} terms={terms} hitRef={hitRef} />
      </div>
      {actions && <div className="ix-preview-actions">{actions}</div>}
    </section>
  );
}
