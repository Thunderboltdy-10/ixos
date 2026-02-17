import { Sparkles } from 'lucide-react';
// import { openExternalUrl } from '@/lib/tauri';
import { getVariantId } from '@/lib/checkout';
import { cn } from '@/lib/utils';

const variantId = getVariantId();

export function UpgradeBanner({ onUpgrade }: { onUpgrade?: () => void }) {
  // const { user } = useAuthStore();

  const handleUpgrade = async () => {
    onUpgrade?.();
  };

  return (
    <div className="mx-3 my-3 relative group">
      {/* Cool animated gradient glow */}
      <div className="absolute -inset-0.5 bg-gradient-to-b from-accent-magenta/40 to-accent-violet/20 rounded-lg opacity-40 blur-lg group-hover:opacity-70 transition-all duration-700 animate-pulse" />
      <div className="relative p-3 rounded-lg border border-accent-magenta/30 bg-graphite-2/80 backdrop-blur-md">
        <div className="flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-accent-magenta mt-0.5" />
          <div className="flex-1">
            <p className="text-xs text-porcelain font-semibold">Ixos Pro</p>
            <p className="text-2xs text-fg-muted mt-1">
              Watch mode, dev file types, priority updates.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleUpgrade}
          disabled={!variantId}
          className={cn(
            "mt-3 w-full py-2 rounded-md text-2xs uppercase tracking-[0.2em] font-semibold",
            "bg-accent-magenta text-graphite-0 hover:bg-accent-magenta/90 transition-all",
            "shadow-glow-magenta hover:scale-[1.02] active:scale-[0.98]",
            "disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
          )}
        >
          Upgrade
        </button>
      </div>
    </div>
  );
}
