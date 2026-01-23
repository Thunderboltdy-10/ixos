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
    <div className={cn('flex items-center gap-1.5', className)}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'flex-1 h-8 px-2.5 py-1 rounded-md',
          'bg-transparent',
          'text-fg-muted text-xs font-mono',
          'placeholder:text-fg-dim/60',
          'focus:outline-none focus:bg-graphite-3/30',
          'hover:bg-graphite-3/20',
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
          'bg-transparent',
          'text-fg-dim hover:text-porcelain hover:bg-graphite-3/50',
          'transition-all duration-150 cursor-pointer'
        )}
      >
        <FolderOpen className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
