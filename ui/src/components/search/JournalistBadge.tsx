import { Shield, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import * as tauri from '@/lib/tauri';

interface JournalistBadgeProps {
  onClear?: () => void;
}

export function JournalistBadge({ onClear }: JournalistBadgeProps) {
  const handleEmergencyClear = async () => {
    await tauri.emergencyClear();
    onClear?.();
  };

  return (
    <div className="flex items-center gap-2 no-drag">
      <Badge variant="journalist" className="flex items-center gap-1.5">
        <Shield className="w-3 h-3" />
        PROTECTED
      </Badge>

      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-danger hover:bg-danger/10"
        onClick={handleEmergencyClear}
        title="Emergency Clear (Ctrl+Shift+Delete)"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}
