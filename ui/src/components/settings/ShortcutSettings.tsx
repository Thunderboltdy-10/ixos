import { useState, useEffect, useCallback } from 'react';
import { Keyboard, RotateCcw } from 'lucide-react';
import * as tauri from '@/lib/tauri';
import type { ShortcutConfig } from '@/lib/types';
import { cn } from '@/lib/utils';

// Map keyboard event codes to display names
const keyDisplayNames: Record<string, string> = {
    Space: 'Space',
    Enter: 'Enter',
    Escape: 'Esc',
    Tab: 'Tab',
    Backspace: 'Backspace',
    // Letters will be uppercase
    // Numbers and function keys keep their names
};

// Map event.code to our backend key format
function eventCodeToKey(code: string): string {
    // Handle letter keys (KeyA -> A)
    if (code.startsWith('Key')) {
        return code.slice(3);
    }
    // Handle digit keys (Digit1 -> 1)
    if (code.startsWith('Digit')) {
        return code.slice(5);
    }
    // Handle function keys
    if (code.startsWith('F') && /^F\d+$/.test(code)) {
        return code;
    }
    // Special keys
    return code;
}

// Format modifiers and key for display
function formatShortcut(config: ShortcutConfig): string {
    const parts = [...config.modifiers];

    // Format key for display
    let keyDisplay = config.key;
    if (keyDisplayNames[config.key]) {
        keyDisplay = keyDisplayNames[config.key];
    } else if (config.key.length === 1) {
        keyDisplay = config.key.toUpperCase();
    }

    parts.push(keyDisplay);
    return parts.join(' + ');
}

export function ShortcutSettings() {
    const [config, setConfig] = useState<ShortcutConfig | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [pendingConfig, setPendingConfig] = useState<ShortcutConfig | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Load current config
    useEffect(() => {
        tauri.getShortcutConfig()
            .then(setConfig)
            .catch(err => setError(String(err)));
    }, []);

    // Handle key recording
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (!isRecording) return;

        e.preventDefault();
        e.stopPropagation();

        // Ignore modifier-only presses
        if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
            return;
        }

        // Build modifiers array
        const modifiers: string[] = [];
        if (e.ctrlKey) modifiers.push('Control');
        if (e.altKey) modifiers.push('Alt');
        if (e.shiftKey) modifiers.push('Shift');
        if (e.metaKey) modifiers.push('Meta');

        // Must have at least one modifier
        if (modifiers.length === 0) {
            setError('Please include at least one modifier key (Ctrl, Alt, Shift, or Win)');
            return;
        }

        const key = eventCodeToKey(e.code);

        setPendingConfig({ modifiers, key });
        setIsRecording(false);
        setError(null);
    }, [isRecording]);

    useEffect(() => {
        if (isRecording) {
            window.addEventListener('keydown', handleKeyDown, true);
            return () => window.removeEventListener('keydown', handleKeyDown, true);
        }
    }, [isRecording, handleKeyDown]);

    const startRecording = () => {
        setIsRecording(true);
        setPendingConfig(null);
        setError(null);
    };

    const cancelRecording = () => {
        setIsRecording(false);
        setPendingConfig(null);
        setError(null);
    };

    const saveShortcut = async () => {
        if (!pendingConfig) return;

        setIsSaving(true);
        setError(null);

        try {
            await tauri.setShortcutConfig(pendingConfig);
            setConfig(pendingConfig);
            setPendingConfig(null);
        } catch (err) {
            setError(String(err));
        } finally {
            setIsSaving(false);
        }
    };

    const resetToDefault = async () => {
        const defaultConfig: ShortcutConfig = {
            modifiers: ['Control'],
            key: 'Space',
        };

        setIsSaving(true);
        setError(null);

        try {
            await tauri.setShortcutConfig(defaultConfig);
            setConfig(defaultConfig);
            setPendingConfig(null);
        } catch (err) {
            setError(String(err));
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
        <h2 className="text-lg font-semibold text-porcelain mb-2">
          Keyboard Shortcuts
        </h2>
        <p className="text-sm text-fg-muted">
          Customize the global shortcut to show/hide Ixos from anywhere.
        </p>
      </div>

      <div className="bg-graphite-2 rounded-lg p-4 border border-stroke-hairline space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-accent-teal/10">
              <Keyboard className="w-5 h-5 text-accent-teal" />
            </div>
            <div>
              <div className="text-sm font-medium text-porcelain">
                Toggle Ixos
              </div>
              <div className="text-xs text-fg-dim">
                Show or hide the search window
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-mono',
                isRecording
                  ? 'bg-accent-teal/20 text-accent-teal border border-accent-teal animate-pulse'
                  : pendingConfig
                    ? 'bg-accent-amber/20 text-accent-amber border border-accent-amber/50'
                    : 'bg-graphite-3 text-porcelain border border-stroke-hairline'
              )}
            >
              {isRecording
                ? 'Press keys...'
                : pendingConfig
                  ? formatShortcut(pendingConfig)
                  : config
                    ? formatShortcut(config)
                    : 'Loading...'}
            </div>

            {!isRecording && !pendingConfig && (
              <button
                onClick={startRecording}
                className="px-3 py-1.5 text-xs uppercase tracking-[0.16em] bg-accent-teal/10 hover:bg-accent-teal/20 text-accent-teal rounded-md transition-colors"
              >
                Change
              </button>
            )}

            {isRecording && (
              <button
                onClick={cancelRecording}
                className="px-3 py-1.5 text-xs uppercase tracking-[0.16em] bg-danger/10 hover:bg-danger/20 text-danger rounded-md transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {pendingConfig && !isRecording && (
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-stroke-hairline">
            <button
              onClick={cancelRecording}
              className="px-3 py-1.5 text-xs uppercase tracking-[0.16em] text-fg-dim hover:text-porcelain transition-colors"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              onClick={saveShortcut}
              disabled={isSaving}
              className="px-3 py-1.5 text-xs uppercase tracking-[0.16em] bg-accent-teal hover:bg-accent-teal/90 text-graphite-0 rounded-md transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}

        {error && (
          <div className="text-sm text-danger bg-danger/10 px-3 py-2 rounded-md">
            {error}
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          onClick={resetToDefault}
          disabled={isSaving}
          className="flex items-center gap-2 px-3 py-1.5 text-xs uppercase tracking-[0.16em] text-fg-dim hover:text-porcelain transition-colors disabled:opacity-50"
        >
          <RotateCcw className="w-4 h-4" />
          Reset to Default (Ctrl + Space)
        </button>
      </div>

      <div className="text-xs text-fg-dim bg-graphite-2/60 px-3 py-2 rounded-md border border-stroke-hairline">
        <strong>Tip:</strong> The shortcut works globally - you can press it from any application
        to instantly access Ixos search.
      </div>
    </div>
  );
}
