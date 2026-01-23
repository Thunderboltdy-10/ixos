export function KeyboardHints() {
  return (
    <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-base/50 text-2xs text-text-muted">
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
