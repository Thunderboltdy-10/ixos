/** A thin yellow line: how far a search has got, or a sweep while the wait has no known length. */
export function Progress({ value, busy = false }: { value: number | null; busy?: boolean }) {
  if (busy) {
    return (
      <div className="ix-progress ix-progress--busy" aria-hidden>
        <span />
      </div>
    );
  }
  return (
    <div className="ix-progress" aria-hidden>
      <span style={{ width: `${(value ?? 1) * 100}%`, opacity: value === null ? 0 : 1 }} />
    </div>
  );
}
