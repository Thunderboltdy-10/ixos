import type { ReactNode } from "react";

interface TitleBarProps {
  children: ReactNode;
  /** Buttons placed before the window controls. */
  actions?: ReactNode;
  onMinimize?: () => void;
  onMaximize?: () => void;
  onClose?: () => void;
}

/** The main window's title bar. The drag region attributes let the desktop window be moved by it. */
export function TitleBar({ children, actions, onMinimize, onMaximize, onClose }: TitleBarProps) {
  return (
    <header className="ix-titlebar" data-tauri-drag-region>
      {children}
      <span className="ix-titlebar-space" data-tauri-drag-region />
      {actions}
      <button className="ix-window-button" aria-label="Minimize" onClick={onMinimize}>
        <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden>
          <path d="M1 6h10" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      </button>
      <button className="ix-window-button" aria-label="Maximize" onClick={onMaximize}>
        <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden>
          <rect x="1.5" y="1.5" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      </button>
      <button className="ix-window-button ix-window-close" aria-label="Close" onClick={onClose}>
        <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden>
          <path d="M1.5 1.5l9 9M10.5 1.5l-9 9" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      </button>
    </header>
  );
}
