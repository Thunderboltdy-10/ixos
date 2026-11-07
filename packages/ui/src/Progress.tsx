/**
 * A thin yellow line: how far a search has got, or a sweep while the wait has no known length.
 * `glimmer` runs light across the finished part during a long read, so it never looks stuck.
 */
export function Progress({ value, busy = false, glimmer = false }: { value: number | null; busy?: boolean; glimmer?: boolean }) {
  if (busy) {
    return (
      <div className="ix-progress ix-progress--busy" aria-hidden>
        <span />
      </div>
    );
  }
  return (
    <div className={`ix-progress${glimmer ? " ix-progress--glimmer" : ""}`} aria-hidden>
      <span style={{ width: `${(value ?? 1) * 100}%`, opacity: value === null ? 0 : 1 }} />
    </div>
  );
}
