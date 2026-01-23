export function KeyboardHints() {
  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-stroke-hairline bg-graphite-1/80 text-2xs text-fg-dim uppercase tracking-[0.18em]">
      <div className="flex items-center gap-4">
        <span>
          <kbd className="kbd">Enter</kbd> Open
        </span>
        <span>
          <kbd className="kbd">Ctrl</kbd>+<kbd className="kbd">Enter</kbd> Reveal
        </span>
      </div>
      <div className="flex items-center gap-4">
        <span>
          <kbd className="kbd">↑↓</kbd> Navigate
        </span>
        <span>
          <kbd className="kbd">Esc</kbd> Close
        </span>
      </div>
    </div>
  );
}
