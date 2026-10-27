import { Copy } from "./Copy";

/** Commands or JSON to copy, under a label saying where they go. */
export function Code({ label, children }: { label: string; children: string }) {
  return (
    <div className="command">
      <div className="command-head">
        <span>{label}</span>
        <Copy text={children} label={`Copy: ${label}`} />
      </div>
      <code>{children}</code>
    </div>
  );
}
