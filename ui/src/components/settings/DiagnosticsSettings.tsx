import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useSearchStore } from '@/stores/searchStore';
import * as tauri from '@/lib/tauri';
import type { DoctorReport, IxosConfig, ModelStatus, ProStatus } from '@/lib/types';

interface CacheStats {
  backendType: string;
  cachedFiles: number;
  totalSizeBytes: number;
  available: boolean;
  cacheMode: string;
}

function badgeClass(status: 'PASS' | 'WARN' | 'FAIL' | 'INFO') {
  if (status === 'PASS') return 'bg-success/15 text-success border-success/30';
  if (status === 'WARN') return 'bg-accent-amber/15 text-accent-amber border-accent-amber/30';
  if (status === 'FAIL') return 'bg-error/15 text-error border-error/30';
  return 'bg-fg-dim/15 text-fg-dim border-fg-dim/30';
}

export function DiagnosticsSettings() {
  const [config, setConfig] = useState<IxosConfig | null>(null);
  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [proStatus, setProStatus] = useState<ProStatus | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [doctor, setDoctor] = useState<DoctorReport | null>(null);
  const [loadingDoctor, setLoadingDoctor] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState('');
  const [error, setError] = useState<string | null>(null);

  const activeDirectory = useSearchStore((s) => s.directory);

  const effectiveDirectory = useMemo(() => {
    return activeDirectory || config?.search.defaultDirectory || '.';
  }, [activeDirectory, config?.search.defaultDirectory]);

  const loadBasics = async () => {
    setError(null);
    try {
      const [cfg, model, pro, dev] = await Promise.all([
        tauri.getConfig(),
        tauri.getModelStatus(),
        tauri.getProStatus().catch(() => null),
        tauri.getDeviceId().catch(() => null),
      ]);
      setConfig(cfg);
      setModelStatus(model);
      setProStatus(pro);
      setDeviceId(dev);

      try {
        const stats = await tauri.getCacheStats(effectiveDirectory);
        setCacheStats(stats);
      } catch {
        setCacheStats(null);
      }
    } catch (e) {
      setError(String(e));
    }
  };

  useEffect(() => {
    loadBasics();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!effectiveDirectory) return;
    tauri.getCacheStats(effectiveDirectory).then(setCacheStats).catch(() => setCacheStats(null));
  }, [effectiveDirectory]);

  const runDoctor = async () => {
    setLoadingDoctor(true);
    setCopyFeedback('');
    try {
      const report = await tauri.runDoctor(true);
      setDoctor(report);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoadingDoctor(false);
    }
  };

  const copyReport = async () => {
    const payload = {
      generatedAt: new Date().toISOString(),
      config,
      modelStatus,
      cacheStats,
      proStatus,
      deviceId,
      doctor,
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setCopyFeedback('Copied');
      setTimeout(() => setCopyFeedback(''), 2000);
    } catch {
      setCopyFeedback('Copy failed');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-porcelain mb-2">Diagnostics</h2>
        <p className="text-xs text-fg-dim">
          Inspect resolved settings, backend capabilities, and doctor checks.
        </p>
      </div>

      {error && (
        <div className="text-xs text-error p-2 bg-error/10 border border-error/20 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Panel title="Resolved Config">
          <Line k="searchMode" v={config?.search.searchMode} />
          <Line k="cacheMode" v={config?.search.cacheMode} />
          <Line k="modelType" v={config?.search.modelType} />
          <Line k="proModelType" v={config?.search.proModelType} />
          <Line k="directory" v={effectiveDirectory} />
        </Panel>

        <Panel title="Model Status">
          <Line k="flashV2" v={String(modelStatus?.ixosFlashV2Available ?? false)} />
          <Line k="proV2" v={String(modelStatus?.ixosProV2Available ?? false)} />
          <Line k="loadedModel" v={modelStatus?.loadedModel ?? '-'} />
        </Panel>

        <Panel title="Cache Backend">
          <Line k="backend" v={cacheStats?.backendType ?? '-'} />
          <Line k="cachedFiles" v={String(cacheStats?.cachedFiles ?? 0)} />
          <Line k="cacheMode" v={cacheStats?.cacheMode ?? '-'} />
        </Panel>

        <Panel title="Pro & Device">
          <Line k="proStatus" v={proStatus?.status ?? 'free'} />
          <Line k="deviceId" v={deviceId ?? '-'} mono />
        </Panel>
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={runDoctor} disabled={loadingDoctor}>
          {loadingDoctor ? 'Running...' : 'Run Doctor'}
        </Button>
        <Button size="sm" variant="outline" onClick={copyReport}>
          Copy Report
        </Button>
        {copyFeedback && <span className="text-xs text-fg-dim">{copyFeedback}</span>}
      </div>

      {doctor && (
        <div className="space-y-3">
          <div className="text-xs text-fg-dim">
            Summary: {doctor.summary.pass} pass, {doctor.summary.warn} warn, {doctor.summary.fail} fail, {doctor.summary.info} info
          </div>
          <div className="space-y-2">
            {doctor.checks.map((check) => (
              <div key={check.id} className="p-3 rounded-lg border border-stroke-hairline bg-graphite-2/35">
                <div className="flex items-center justify-between gap-3 mb-1">
                  <div className="text-sm text-porcelain">{check.name}</div>
                  <span className={`px-2 py-0.5 rounded border text-2xs ${badgeClass(check.status)}`}>{check.status}</span>
                </div>
                <div className="text-xs text-fg-dim">{check.message}</div>
                {check.details && <div className="text-2xs text-fg-ghost mt-1">{check.details}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-stroke-hairline bg-graphite-2/45 p-3 space-y-1">
      <div className="text-xs text-fg-muted uppercase tracking-wide mb-1">{title}</div>
      {children}
    </div>
  );
}

function Line({ k, v, mono }: { k: string; v: string | undefined; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="text-fg-muted">{k}</span>
      <span className={`${mono ? 'font-mono' : ''} text-fg-secondary truncate max-w-[70%]`}>{v ?? '-'}</span>
    </div>
  );
}

