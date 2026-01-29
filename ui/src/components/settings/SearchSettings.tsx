import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useSettingsStore } from '@/stores/settingsStore';
import { useSearchStore } from '@/stores/searchStore';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Database, Trash2, RefreshCw, HardDrive, DownloadCloud, Loader2, Check } from 'lucide-react';
import { formatFileSize } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface CacheStats {
  backendType: string;
  cachedFiles: number;
  totalSizeBytes: number;
  available: boolean;
  cacheMode: string;
}

interface ModelStatus {
  ixosFlashV1Available: boolean;
  ixosFlashV1Path: string | null;
  ixosProV1Available: boolean;
  ixosProV1Path: string | null;
  anyAvailable: boolean;
  recommended: string | null;
  loadedModel: string | null;
}


export function SearchSettings() {
  const { config, updateConfig, resetConfig, isLoading } = useSettingsStore();

  if (!config) {
    return <div className="text-fg-dim">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-porcelain mb-4">Search Settings</h2>
      </div>

      {/* Default limit */}
      <SettingRow
        label="Default result limit"
        description="Maximum number of results to show"
      >
        <Input
          type="number"
          value={config.search.defaultLimit}
          onChange={(e) =>
            updateConfig({
              search: { ...config.search, defaultLimit: parseInt(e.target.value) || 20 },
            })
          }
          className="w-24"
          min={1}
          max={100}
        />
      </SettingRow>

      {/* Timeout */}
      <SettingRow
        label="Search timeout"
        description="Maximum time to wait for results (seconds)"
      >
        <Input
          type="number"
          value={config.search.timeoutSeconds}
          onChange={(e) =>
            updateConfig({
              search: { ...config.search, timeoutSeconds: parseInt(e.target.value) || 5 },
            })
          }
          className="w-24"
          min={1}
          max={60}
        />
      </SettingRow>

      {/* Context lines */}
      <SettingRow
        label="Context lines"
        description="Lines of context around matches"
      >
        <Input
          type="number"
          value={config.search.contextLines}
          onChange={(e) =>
            updateConfig({
              search: { ...config.search, contextLines: parseInt(e.target.value) || 3 },
            })
          }
          className="w-24"
          min={0}
          max={10}
        />
      </SettingRow>

      {/* Minimum score threshold */}
      <SettingRow
        label="Minimum score threshold"
        description="Hide results below this score (0-100%)"
      >
        <Input
          type="number"
          value={Math.round(config.search.minScoreThreshold * 100)}
          onChange={(e) =>
            updateConfig({
              search: { ...config.search, minScoreThreshold: (parseInt(e.target.value) || 10) / 100 },
            })
          }
          className="w-24"
          min={0}
          max={100}
        />
      </SettingRow>

      {/* Secure ranking */}
      <SettingRow
        label="Secure ranking"
        description="Enable integrity verification and behavioral scoring"
      >
        <Switch
          checked={config.search.enableSecureRanking}
          onCheckedChange={(checked) =>
            updateConfig({
              search: { ...config.search, enableSecureRanking: checked },
            })
          }
        />
      </SettingRow>

      {/* Default search mode */}
      <SettingRow
        label="Default search mode"
        description="Choose Flash, Auto, or Pro mode"
      >
        <select
          value={config.search.searchMode}
          onChange={(e) =>
            updateConfig({
              search: { ...config.search, searchMode: e.target.value as typeof config.search.searchMode },
            })
          }
          className="w-32 bg-graphite-2 border border-stroke-hairline rounded-md px-2 py-1 text-xs text-porcelain"
        >
          <option value="flash">Flash</option>
          <option value="auto">Auto</option>
          <option value="pro">Pro</option>
        </select>
      </SettingRow>

      {/* Pro model selection */}
      <SettingRow
        label="Pro model"
        description="Model used when Pro or Auto refinement is enabled"
      >
        <select
          value={config.search.proModelType}
          onChange={(e) =>
            updateConfig({
              search: { ...config.search, proModelType: e.target.value as typeof config.search.proModelType },
            })
          }
          className="w-44 bg-graphite-2 border border-stroke-hairline rounded-md px-2 py-1 text-xs text-porcelain"
        >
          <option value="potion">Potion 8M (recommended)</option>
          <option value="ixos-flash-v4-int8-512">Ixos Flash v4 (quality)</option>
          <option value="ixos-flash-v4-int8-192">Ixos Flash v4 Fast</option>
          <option value="ixos-flash-v1">Ixos Flash v1 (legacy)</option>
          <option value="ixos-pro-v1">Ixos Pro v1 (legacy)</option>
          <option value="qwen">Ixos Embedder v1 (Qwen)</option>
        </select>
      </SettingRow>

      {/* Cache Mode */}
      <SettingRow
        label="Embedding cache mode"
        description="Control how embeddings are stored"
      >
        <select
          value={config.search.cacheMode}
          onChange={(e) => {
            const newValue = e.target.value;
            updateConfig({
              search: { ...config.search, cacheMode: newValue },
            });
            // P3 Badge: Sync with search store immediately so it applies to the current session
            // without requiring a mode switch
            useSearchStore.getState().setCacheMode(newValue as 'cache' | 'jit');
          }}
          className="w-36 bg-graphite-2 border border-stroke-hairline rounded-md px-2 py-1 text-xs text-porcelain"
        >
          <option value="jit">Off (JIT only)</option>
          <option value="cache">Persistent (ADS/xattr)</option>
        </select>
      </SettingRow>

      {/* Model Management Panel */}
      <ModelManagementPanel />

      {/* Cache Stats Panel */}
      <CachePanel />

      <SettingRow
        label="Show score breakdown"
        description="Display detailed score components in results"
      >
        <Switch
          checked={config.output.showScores}
          onCheckedChange={(checked) =>
            updateConfig({
              output: { ...config.output, showScores: checked },
            })
          }
        />
      </SettingRow>

      {/* Exit on Close */}
      <SettingRow
        label="Quit on Close"
        description="Quit the application when the window is closed (instead of minimizing to tray)"
      >
        <Switch
          checked={config.output.exitOnClose}
          onCheckedChange={(checked) =>
            updateConfig({
              output: { ...config.output, exitOnClose: checked },
            })
          }
        />
      </SettingRow>

      {/* Reset button */}
      <div className="pt-4 border-t border-stroke-hairline">
        <Button
          variant="outline"
          onClick={resetConfig}
          disabled={isLoading}
        >
          Reset to Defaults
        </Button>
      </div>
    </div>
  );
}

interface SettingRowProps {
  label: string;
  description: string;
  children: React.ReactNode;
}

function SettingRow({ label, description, children }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-stroke-hairline last:border-b-0">
      <div>
        <p className="text-sm font-medium text-porcelain">{label}</p>
        <p className="text-xs text-fg-dim mt-0.5">{description}</p>
      </div>
      {children}
    </div>
  );
}

/**
 * Cache statistics and management panel
 */
function CachePanel() {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [clearResult, setClearResult] = useState<string | null>(null);
  const { directory } = useSearchStore();

  const loadStats = async () => {
    if (!directory) return;

    setIsLoading(true);
    try {
      const result = await invoke<CacheStats>('get_cache_stats', { directory });
      setStats(result);
    } catch (error) {
      console.error('Failed to load cache stats:', error);
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearCache = async () => {
    if (!directory) return;

    setIsClearing(true);
    setClearResult(null);
    try {
      const count = await invoke<number>('clear_embedding_cache', { directory });
      setClearResult(`Cleared ${count} cached embeddings`);
      await loadStats();
    } catch (error) {
      console.error('Failed to clear cache:', error);
      setClearResult('Failed to clear cache');
    } finally {
      setIsClearing(false);
    }
  };

  useEffect(() => {
    if (directory) {
      loadStats();
    }
  }, [directory]);

  if (!directory) {
    return (
      <div className="py-3 border-b border-stroke-hairline">
        <div className="flex items-center gap-2 text-fg-dim text-xs">
          <Database className="w-4 h-4" />
          <span>Select a search directory to view cache stats</span>
        </div>
      </div>
    );
  }

  return (
    <div className="py-3 border-b border-stroke-hairline">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-accent-teal" />
          <span className="text-sm font-medium text-porcelain">Embedding Cache</span>
        </div>
        <button
          onClick={loadStats}
          disabled={isLoading}
          className="p-1.5 rounded hover:bg-graphite-3 transition-colors"
          title="Refresh stats"
        >
          <RefreshCw className={cn('w-3.5 h-3.5 text-fg-dim', isLoading && 'animate-spin')} />
        </button>
      </div>

      {isLoading && !stats ? (
        <div className="text-xs text-fg-dim">Loading cache statistics...</div>
      ) : stats ? (
        <div className="space-y-3">
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-graphite-2/50 rounded-md px-3 py-2">
              <div className="text-2xs text-fg-dim uppercase tracking-wider">Backend</div>
              <div className="text-sm text-porcelain mt-0.5 font-mono">{stats.backendType.split(' ')[0]}</div>
            </div>
            <div className="bg-graphite-2/50 rounded-md px-3 py-2">
              <div className="text-2xs text-fg-dim uppercase tracking-wider">Cached Files</div>
              <div className="text-sm text-porcelain mt-0.5 font-mono">{stats.cachedFiles}</div>
            </div>
            <div className="bg-graphite-2/50 rounded-md px-3 py-2 col-span-2">
              <div className="text-2xs text-fg-dim uppercase tracking-wider">Estimated Size</div>
              <div className="flex items-center gap-2 mt-0.5">
                <HardDrive className="w-3.5 h-3.5 text-fg-dim" />
                <span className="text-sm text-porcelain font-mono">{formatFileSize(stats.totalSizeBytes)}</span>
              </div>
            </div>
          </div>

          {/* Clear cache button */}
          <div className="flex items-center justify-between pt-2 border-t border-stroke-hairline/50">
            <div className="text-xs text-fg-dim">
              {clearResult && (
                <span className={clearResult.includes('Failed') ? 'text-danger' : 'text-success'}>
                  {clearResult}
                </span>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearCache}
              disabled={isClearing || stats.cachedFiles === 0}
              className="text-xs"
            >
              {isClearing ? (
                <>
                  <RefreshCw className="w-3 h-3 mr-1.5 animate-spin" />
                  Clearing...
                </>
              ) : (
                <>
                  <Trash2 className="w-3 h-3 mr-1.5" />
                  Clear Cache
                </>
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-xs text-fg-dim">Unable to load cache statistics</div>
      )}
    </div>
  );
}

/**
 * Model management panel
 */
function ModelManagementPanel() {
  const [status, setStatus] = useState<ModelStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = async () => {
    setIsLoading(true);
    try {
      const result = await invoke<ModelStatus>('get_model_status');
      setStatus(result);
    } catch (error) {
      console.error('Failed to load model status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (modelType: string) => {
    setDownloading(modelType);
    setError(null);
    try {
      await invoke('download_model', { modelType });
      await loadStatus();
    } catch (err) {
      console.error('Failed to download model:', err);
      if (String(err).includes('401')) {
        setError('Unauthorized. Please check your internet connection.');
      } else {
        setError(typeof err === 'string' ? err : 'Download failed');
      }
    } finally {
      setDownloading(null);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  if (!status && !isLoading) {
    return (
      <div className="py-3 border-b border-stroke-hairline">
        <div className="text-xs text-fg-dim">Unable to load model status</div>
      </div>
    );
  }

  const models = [
    { id: 'ixos-flash-v1', label: 'Ixos Flash V1', available: status?.ixosFlashV1Available },
    { id: 'ixos-pro-v1', label: 'Ixos Pro V1', available: status?.ixosProV1Available },
  ];

  return (
    <div className="py-3 border-b border-stroke-hairline">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-accent-teal" />
          <span className="text-sm font-medium text-porcelain">Installed Models</span>
        </div>
        <button
          onClick={loadStatus}
          disabled={isLoading}
          className="p-1.5 rounded hover:bg-graphite-3 transition-colors"
          title="Refresh status"
        >
          <RefreshCw className={cn('w-3.5 h-3.5 text-fg-dim', isLoading && 'animate-spin')} />
        </button>
      </div>

      <div className="space-y-2">
        {models.map((model) => (
          <div key={model.id} className="flex items-center justify-between bg-graphite-2/50 rounded-md px-3 py-2">
            <span className="text-sm text-porcelain">{model.label}</span>
            <div className="flex items-center gap-3">
              {model.available ? (
                <div className="flex items-center gap-1.5 text-xs text-accent-teal">
                  <Check className="w-3.5 h-3.5" />
                  <span>Installed</span>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-accent-teal hover:bg-accent-teal/10 hover:text-accent-teal"
                  disabled={!!downloading}
                  onClick={() => handleDownload(model.id)}
                >
                  {downloading === model.id ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <DownloadCloud className="w-3 h-3 mr-1.5" />
                      Download
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>



      {error && (
        <div className="mt-2 text-xs text-error p-2 bg-error/10 border border-error/20 rounded">
          {error}
        </div>
      )}
    </div>
  );
}
