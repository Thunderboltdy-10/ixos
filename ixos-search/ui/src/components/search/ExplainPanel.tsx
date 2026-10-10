import { useEffect, useState } from 'react';
import * as tauri from '@/lib/tauri';
import type { RankedResult, PersonalSignals } from '@/lib/types';
export function ExplainPanel({ result }: {
    result: RankedResult;
}) {
    const [signals, setSignals] = useState<PersonalSignals | null>(null);
    useEffect(() => {
        tauri.getPersonalSignals(result.path).then(setSignals).catch(() => setSignals(null));
    }, [true, result.path]);
    const breakdown = result.scoreBreakdown;
    const personal = breakdown.personal ?? 0;
    const base = breakdown.semantic * 0.4 +
        breakdown.integrity * 0.3 +
        breakdown.temporal * 0.1 +
        breakdown.behavior * 0.2;
    return (<div className="text-xs bg-graphite-2/35 border border-stroke-hairline rounded-md px-3 py-2 space-y-1">
      <div className="text-fg-secondary">Base score: {base.toFixed(3)}</div>
      <div className="text-fg-secondary">Semantic similarity: {breakdown.semantic.toFixed(3)}</div>
      <div className="text-fg-secondary">Personal boost: {personal.toFixed(3)}</div>
      <div className="text-fg-muted">
        Pin: {signals?.pinned ? 'yes' : 'no'} | Ignore: {signals?.ignored ? 'yes' : 'no'}
      </div>
    </div>);
}
