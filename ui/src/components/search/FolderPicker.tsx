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
          'flex-1 h-9 px-3 py-1 rounded-md',
          'bg-graphite-3 border border-stroke-hairline',
          'text-fg-muted text-xs font-mono',
          'placeholder:text-fg-dim',
          'focus:outline-none focus:border-accent-teal/50',
          'hover:border-border-medium',
          'transition-all duration-200'
        )}
        spellCheck={false}
      />
      <button
        type="button"
        onClick={handleBrowse}
        title="Browse for folder"
        className={cn(
          'flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-md',
          'bg-graphite-3 border border-stroke-hairline',
          'text-fg-dim hover:text-porcelain hover:bg-graphite-2 hover:border-border-medium',
          'transition-all duration-150 cursor-pointer'
        )}
      >
        <FolderOpen className="w-4 h-4" />
      </button>
    </div>
  );
}
