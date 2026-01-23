import { FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import * as tauri from '@/lib/tauri';

interface FolderPickerProps {
  value: string;
  onChange: (path: string) => void;
  className?: string;
  placeholder?: string;
}

export function FolderPicker({
  value,
  onChange,
  className,
  placeholder = 'Select folder...'
}: FolderPickerProps) {
  const handleBrowse = async () => {
    try {
      // Use Tauri command instead of direct plugin access
      const path = await tauri.selectDirectory();

      if (path) {
        onChange(path);
      }
    } catch (error) {
      console.error('Failed to open folder dialog:', error);
    }
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'flex-1 h-8 px-3 py-1 rounded-md',
          'bg-surface-3 border border-border',
          'text-text-secondary text-xs font-mono',
          'placeholder:text-text-muted',
          'focus:outline-none focus:border-brand-teal/50',
          'hover:border-border-accent',
          'transition-all duration-200'
        )}
        spellCheck={false}
      />
      <button
        type="button"
        onClick={handleBrowse}
        title="Browse for folder"
        className={cn(
          'flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-md',
          'bg-surface-3 border border-border',
          'text-text-muted hover:text-text-primary hover:bg-surface-2 hover:border-brand-teal/30',
          'transition-all duration-150 cursor-pointer'
        )}
      >
        <FolderOpen className="w-4 h-4" />
      </button>
    </div>
  );
}
