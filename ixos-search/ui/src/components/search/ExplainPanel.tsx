import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { hasProAccess } from '@/lib/proAccess';
import * as tauri from '@/lib/tauri';
import type { RankedResult, PersonalSignals } from '@/lib/types';

export function ExplainPanel({ result }: { result: RankedResult }) {
  const entitlement = useAuthStore((s) => s.entitlement);
  const entitlementToken = useAuthStore((s) => s.entitlementToken);
  const proStatus = useAuthStore((s) => s.proStatus);
  const isPro = hasProAccess(entitlement, entitlementToken, proStatus);
  const [signals, setSignals] = useState<PersonalSignals | null>(null);

  useEffect(() => {
    if (!isPro) return;
    tauri.getPersonalSignals(result.path).then(setSignals).catch(() => setSignals(null));
  }, [isPro, result.path]);

  if (!isPro) {
    return (
      <div className="flex items-center justify-between text-xs bg-graphite-2/40 border border-accent-violet/15 rounded-lg px-3 py-2.5">
        <span className="text-fg-muted">Score breakdown and evidence available on Pro.</span>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('open-pricing'))}
          className="ml-3 shrink-0 px-2.5 py-1 rounded-md text-[11px] font-medium bg-accent-violet/12 text-accent-violet border border-accent-violet/25 hover:bg-accent-violet/20 transition-colors"
        >
          Upgrade
        </button>
      </div>
    );
  }

  const breakdown = result.scoreBreakdown;
  const personal = breakdown.personal ?? 0;
  const base =
    breakdown.semantic * 0.4 +
    breakdown.integrity * 0.3 +
    breakdown.temporal * 0.1 +
    breakdown.behavior * 0.2;

  return (
    <div className="text-xs bg-graphite-2/35 border border-stroke-hairline rounded-md px-3 py-2 space-y-1">
      <div className="text-fg-secondary">Base score: {base.toFixed(3)}</div>
      <div className="text-fg-secondary">Semantic similarity: {breakdown.semantic.toFixed(3)}</div>
      <div className="text-fg-secondary">Personal boost: {personal.toFixed(3)}</div>
      <div className="text-fg-muted">
        Pin: {signals?.pinned ? 'yes' : 'no'} | Ignore: {signals?.ignored ? 'yes' : 'no'}
      </div>
    </div>
  );
}

