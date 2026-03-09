import { motion } from 'framer-motion';
import { GitBranch, ArrowRight } from 'lucide-react';
import type { SuggestedFile } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ConnectionMapProps {
  sourcePath: string;
  suggestions: SuggestedFile[];
  onOpenFile?: (path: string) => void;
}

function tail(path: string): string {
  return path.split(/[/\\]/).pop() || path;
}

export function ConnectionMap({ sourcePath, suggestions, onOpenFile }: ConnectionMapProps) {
  if (!sourcePath || suggestions.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="space-y-3"
    >
      <h2 className="text-sm font-semibold text-fg-muted uppercase tracking-wider flex items-center gap-2">
        <GitBranch className="w-4 h-4 text-accent-teal" />
        Connection Map
      </h2>

      <div className="rounded-lg border border-white/10 bg-graphite-1/55 p-3">
        <div className="rounded-md border border-accent-teal/30 bg-accent-teal/10 px-3 py-2 text-xs text-accent-teal font-medium truncate">
          Source: {tail(sourcePath)}
        </div>

        <div className="mt-3 space-y-2">
          {suggestions.slice(0, 5).map((suggestion) => {
            const strength = Math.max(10, Math.round(suggestion.score * 100));
            return (
              <button
                key={suggestion.path}
                type="button"
                onClick={() => onOpenFile?.(suggestion.path)}
                className={cn(
                  'w-full rounded-md border border-white/8 bg-graphite-2/45 p-2 text-left',
                  'hover:border-accent-teal/35 hover:bg-graphite-2/7 transition-colors'
                )}
              >
                <div className="flex items-center gap-2 text-xs">
                  <ArrowRight className="w-3 h-3 text-accent-teal shrink-0" />
                  <span className="text-fg-secondary truncate flex-1">{suggestion.name}</span>
                  <span className="text-fg-ghost">{strength}%</span>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-graphite-3 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-accent-teal to-accent-violet"
                    style={{ width: `${strength}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}
