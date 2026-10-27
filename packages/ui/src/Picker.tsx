"use client";

import { CheckIcon, ChevronDown } from "./icons";
import { useEffect, useRef, useState, type ReactNode } from "react";

export interface Choice<T> {
  value: T;
  label: string;
  detail?: string;
}

interface PickerProps<T> {
  label: ReactNode;
  hint?: string;
  title: string;
  choices: Choice<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Shown after the choices, for example "Add folder". */
  action?: { label: string; run: () => void };
}

/** A borderless button that opens a short menu. */
export function Picker<T>({ label, hint, title, choices, value, onChange, action }: PickerProps<T>) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);
  const choose = (next: T) => {
    setOpen(false);
    onChange(next);
  };
  return (
    <div
      className="ix-picker-root"
      ref={root}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.stopPropagation();
          setOpen(false);
        }
      }}
    >
      <button className="ix-picker" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="ix-picker-label">{label}</span>
        {hint && <span className="ix-picker-hint">{hint}</span>}
        <ChevronDown />
      </button>
      {open && (
        <div className="ix-menu" role="menu" aria-label={title}>
          <p className="ix-menu-title">{title}</p>
          {choices.map((choice) => (
            <button
              key={String(choice.value)}
              role="menuitemradio"
              aria-checked={choice.value === value}
              className="ix-menu-item"
              onClick={() => choose(choice.value)}
            >
              <span>
                <span className="ix-menu-label">{choice.label}</span>
                {choice.detail && <span className="ix-menu-detail">{choice.detail}</span>}
              </span>
              {choice.value === value && <CheckIcon size={14} />}
            </button>
          ))}
          {action && (
            <>
              <hr />
              <button
                role="menuitem"
                className="ix-menu-item ix-menu-action"
                onClick={() => {
                  setOpen(false);
                  action.run();
                }}
              >
                {action.label}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
