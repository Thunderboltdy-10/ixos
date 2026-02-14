import { Layers3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function JournalistBadge() {
  return (
    <div className="flex items-center gap-2 no-drag">
      <Badge variant="journalist" className="flex items-center gap-1.5">
        <Layers3 className="w-3 h-3" />
        DEEP SEARCH
      </Badge>
    </div>
  );
}
