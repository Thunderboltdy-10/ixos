import { Sparkles } from 'lucide-react';
// import { openExternalUrl } from '@/lib/tauri';
import { getVariantId } from '@/lib/checkout';

const variantId = getVariantId();

export function UpgradeBanner({ onUpgrade }: { onUpgrade?: () => void }) {
  // const { user } = useAuthStore();

  const handleUpgrade = async () => {
    onUpgrade?.();
  };

  return (
    <div className="mx-3 my-3 p-3 rounded-lg border border-accent-magenta/30 bg-accent-magenta/10 shadow-glow-magenta">
      <div className="flex items-start gap-2">
        <Sparkles className="w-4 h-4 text-accent-magenta mt-0.5" />
        <div className="flex-1">
          <p className="text-xs text-porcelain font-semibold">Upgrade to Pro</p>
          <p className="text-2xs text-fg-muted mt-1">
            Unlock watch mode, advanced file types, and priority updates.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={handleUpgrade}
        disabled={!variantId}
        className="mt-3 w-full py-2 rounded-md bg-accent-magenta text-graphite-0 text-2xs uppercase tracking-[0.2em] font-semibold hover:bg-accent-magenta/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        Upgrade
      </button>
    </div>
  );
}
