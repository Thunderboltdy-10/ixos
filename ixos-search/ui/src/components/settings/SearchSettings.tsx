import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAuth } from '@clerk/clerk-react';
import { useSettingsStore } from '@/stores/settingsStore';
import { useSearchStore } from '@/stores/searchStore';
import * as tauri from '@/lib/tauri';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Database, Trash2, RefreshCw, HardDrive, DownloadCloud, Loader2, Check, Lock } from 'lucide-react';
import { formatFileSize } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { hasProAccess } from '@/lib/proAccess';
import { storeEntitlementToken } from '@/lib/authToken';
import type { ProStatus } from '@/lib/types';

interface CacheStats {
  backendType: string;
  cachedFiles: number;
  totalSizeBytes: number;
  available: boolean;
  cacheMode: string;
}

interface ModelStatus {
  ixosFlashV2Available: boolean;
  ixosFlashV2Path: string | null;
  ixosProV2Available: boolean;
  ixosProV2Path: string | null;
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
  const entitlement = useAuthStore((s) => s.entitlement);
  const entitlementToken = useAuthStore((s) => s.entitlementToken);
  const proStatus = useAuthStore((s) => s.proStatus);
  const isPro = hasProAccess(entitlement, entitlementToken, proStatus);

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
        description="Choose Ixos Flash, Auto, or Ixos Pro"
      >
        <div className="flex flex-col items-end gap-1">
          <select
            value={isPro ? config.search.searchMode : 'flash'}
          onChange={(e) =>
            updateConfig({
              search: { ...config.search, searchMode: e.target.value as typeof config.search.searchMode },
            })
          }
          className="ixos-select w-32 h-8 bg-graphite-2 border border-white/10 rounded-lg px-2.5 text-xs text-porcelain"
        >
          <option value="flash">Ixos Flash</option>
            <option value="auto" disabled={!isPro}>Auto</option>
            <option value="pro" disabled={!isPro}>Ixos Pro</option>
        </select>
          {!isPro && (
            <span className="text-[10px] text-fg-dim/70">
              Auto and Pro modes require an active Pro entitlement.
            </span>
          )}
        </div>
      </SettingRow>



      {/* Cache Mode */}
      <SettingRow
        label="Embedding cache mode"
        description="Control how embeddings are stored"
      >
        <div className="flex flex-col items-end gap-1">
          <select
            value={config.search.cacheMode}
            onChange={(e) => {
              const newValue = e.target.value;
              updateConfig({
                search: { ...config.search, cacheMode: newValue },
              });
              useSearchStore.getState().setCacheMode(newValue as 'native-cache' | 'ephemeral');
            }}
            className="ixos-select w-36 h-8 bg-graphite-2 border border-white/10 rounded-lg px-2.5 text-xs text-porcelain"
          >
            <option value="native-cache">Local (Recommended)</option>
            <option value="ephemeral">Memory (No Disk Cache)</option>
          </select>
          <span className="text-[10px] text-fg-dim/60 max-w-[220px] text-right">
            Cache uses file metadata (ADS/xattr), not separate files. Safe for git repos.
          </span>
        </div>
      </SettingRow>

      {/* Model Management Panel */}
      <ModelManagementPanel />

      {/* Cache Stats Panel */}
      <CachePanel />

      {/* Personal Ranking Panel */}
      <PersonalRankingPanel isPro={isPro} />

      {/* Entitlement / Pro Status Panel */}
      <EntitlementPanel />

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
    <div className="flex items-center justify-between py-3 border-b border-stroke-hairline/70 last:border-b-0">
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
  const [isClearingGlobal, setIsClearingGlobal] = useState(false);
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

  const handleClearLocalCache = async () => {
    setIsClearing(true);
    setClearResult(null);
    try {
      const count = await tauri.cacheClear(directory || null);
      setClearResult(`Cleared ${count} local cache entries`);
      if (directory) {
        await loadStats();
      }
    } catch (error) {
      console.error('Failed to clear cache:', error);
      setClearResult('Failed to clear cache');
    } finally {
      setIsClearing(false);
    }
  };

  const handleClearGlobalCache = async () => {
    setIsClearingGlobal(true);
    setClearResult(null);
    try {
      const count = await tauri.cacheClear(null);
      setClearResult(`Cleared ${count} cache entries`);
      if (directory) {
        await loadStats();
      }
    } catch (error) {
      console.error('Failed to clear all cache:', error);
      setClearResult('Failed to clear all cache');
    } finally {
      setIsClearingGlobal(false);
    }
  };

  useEffect(() => {
    if (directory) {
      loadStats();
    }
  }, [directory]);

  return (
    <div className="rounded-xl border border-white/10 bg-graphite-2/55 backdrop-blur-md p-4">
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

      {!directory ? (
        <div className="space-y-3">
          <div className="text-xs text-fg-dim">Run a search first to view cache stats for a specific folder.</div>
          <p className="text-[10px] text-fg-dim/50">
            Cache uses metadata streams (ADS/xattr) or the app sidecar cache. It does not change git-tracked file contents.
          </p>
        </div>
      ) : isLoading && !stats ? (
        <div className="text-xs text-fg-dim">Loading cache statistics...</div>
      ) : stats ? (
        <div className="space-y-3">
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-graphite-2/55 rounded-lg border border-white/8 px-3 py-2">
              <div className="text-2xs text-fg-dim uppercase tracking-wider">Backend</div>
              <div className="text-sm text-porcelain mt-0.5 font-mono">{stats.backendType.split(' ')[0]}</div>
            </div>
            <div className="bg-graphite-2/55 rounded-lg border border-white/8 px-3 py-2">
              <div className="text-2xs text-fg-dim uppercase tracking-wider">Cached Files</div>
              <div className="text-sm text-porcelain mt-0.5 font-mono">{stats.cachedFiles}</div>
            </div>
            <div className="bg-graphite-2/55 rounded-lg border border-white/8 px-3 py-2 col-span-2">
              <div className="text-2xs text-fg-dim uppercase tracking-wider">Approx. Size</div>
              <div className="flex items-center gap-2 mt-0.5">
                <HardDrive className="w-3.5 h-3.5 text-fg-dim" />
                <span className="text-sm text-porcelain font-mono">{formatFileSize(stats.totalSizeBytes)}</span>
              </div>
            </div>
          </div>

          {/* Clear cache button */}
          <div className="flex items-center justify-between pt-2 border-t border-stroke-hairline/50 gap-2">
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
              onClick={handleClearLocalCache}
              disabled={isClearing}
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
                  Clear Local Cache
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearGlobalCache}
              disabled={isClearingGlobal}
              className="text-xs"
            >
              {isClearingGlobal ? (
                <>
                  <RefreshCw className="w-3 h-3 mr-1.5 animate-spin" />
                  Clearing All...
                </>
              ) : (
                <>
                  <Trash2 className="w-3 h-3 mr-1.5" />
                  Clear All Cache
                </>
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-xs text-fg-dim">Unable to load cache statistics</div>
      )}

      {!directory && (
        <div className="flex items-center justify-between pt-3 border-t border-stroke-hairline/50 mt-3">
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
            onClick={handleClearGlobalCache}
            disabled={isClearingGlobal}
            className="text-xs"
          >
            {isClearingGlobal ? (
              <>
                <RefreshCw className="w-3 h-3 mr-1.5 animate-spin" />
                Clearing All...
              </>
            ) : (
              <>
                <Trash2 className="w-3 h-3 mr-1.5" />
                Clear Local Cache
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

function PersonalRankingPanel({ isPro }: { isPro: boolean }) {
  const { config, updateConfig } = useSettingsStore();
  const { directory } = useSearchStore();
  const [isResetting, setIsResetting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!config) return null;

  const enabled = !!config.search.personalRankingEnabled;

  const onResetLearning = async () => {
    if (!directory) {
      setMessage('Run a search first so Ixos knows which directory to reset.');
      return;
    }
    setIsResetting(true);
    setMessage(null);
    try {
      const cleared = await invoke<number>('reset_learning', { directory });
      setMessage(`Cleared personal signals for ${cleared} files.`);
    } catch (error) {
      setMessage(`Reset failed: ${String(error)}`);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-graphite-2/55 backdrop-blur-md p-4 space-y-3">
      <SettingRow
        label="Personal ranking (local)"
        description="Learn from file opens and pin/ignore actions to improve ranking"
      >
        <div className="flex items-center gap-2">
          {!isPro && <Lock className="w-3.5 h-3.5 text-fg-dim" />}
          <Switch
            checked={enabled && isPro}
            disabled={!isPro}
            onCheckedChange={(checked) =>
              updateConfig({
                search: { ...config.search, personalRankingEnabled: checked },
              })
            }
          />
        </div>
      </SettingRow>

      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-porcelain">Reset learning</p>
          <p className="text-xs text-fg-dim mt-0.5">
            Clears pin/ignore/open-score signals for files in the active directory.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onResetLearning} disabled={isResetting}>
          {isResetting ? 'Resetting...' : 'Reset Learning'}
        </Button>
      </div>
      {message && <p className="text-xs text-fg-dim">{message}</p>}
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
  const [hfToken, setHfToken] = useState(() => localStorage.getItem('ix_hf_token') || '');
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);

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

  const handleDownload = async (modelType: string, retryCount = 0) => {
    setDownloading(modelType);
    setError(null);
    setDownloadProgress(0);
    try {
      const token = hfToken.trim() || null;
      if (token) localStorage.setItem('ix_hf_token', token);
      await invoke('download_model', { modelType, hfToken: token });
      setDownloadProgress(100);
      await loadStatus();
    } catch (err) {
      console.error('Failed to download model:', err);
      const msg = String(err);
      if (msg.includes('403') || msg.includes('401') || msg.includes('Access denied')) {
        setError('Authentication required. Some models need a HuggingFace token. Enter it below and retry.');
      } else if (msg.includes('429') || msg.includes('Rate limited')) {
        if (retryCount < 3) {
          const delay = Math.pow(2, retryCount) * 1000;
          await new Promise((r) => setTimeout(r, delay));
          return handleDownload(modelType, retryCount + 1);
        }
        setError('Rate limited by HuggingFace. Please wait a moment and try again.');
      } else {
        setError(typeof err === 'string' ? err : 'Download failed. Check your connection and try again.');
      }
    } finally {
      setDownloading(null);
      setDownloadProgress(null);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  if (!status && !isLoading) {
    return (
      <div className="rounded-xl border border-white/10 bg-graphite-2/55 backdrop-blur-md p-4">
        <div className="text-xs text-fg-dim">Unable to load model status</div>
      </div>
    );
  }

  const models = [
    { id: 'ixos-flash-v2', label: 'Ixos Flash', available: status?.ixosFlashV2Available },
    { id: 'ixos-pro-v2', label: 'Ixos Pro', available: status?.ixosProV2Available },
  ];

  return (
    <div className="rounded-xl border border-white/10 bg-graphite-2/55 backdrop-blur-md p-4">
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
          <div key={model.id} className="flex items-center justify-between bg-graphite-2/55 rounded-lg border border-white/8 px-3 py-2">
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



      {downloading && downloadProgress !== null && (
        <div className="mt-2">
          <div className="h-1.5 w-full bg-graphite-3 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent-teal rounded-full transition-all duration-300"
              style={{ width: `${Math.max(downloadProgress, 5)}%` }}
            />
          </div>
          <p className="text-[10px] text-fg-dim mt-1">Downloading...</p>
        </div>
      )}

      {error && (
        <div className="mt-2 text-xs text-error p-2 bg-error/10 border border-error/20 rounded">
          {error}
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-white/8">
        <label className="text-[11px] text-fg-muted block mb-1.5">HuggingFace Token (optional)</label>
        <input
          type="password"
          value={hfToken}
          onChange={(e) => setHfToken(e.target.value)}
          placeholder="hf_..."
          className="w-full px-2.5 py-1.5 text-xs bg-graphite-2/60 border border-white/10 rounded-md text-porcelain placeholder:text-fg-dim focus:outline-none focus:border-accent-teal/40"
        />
        <p className="text-[10px] text-fg-dim mt-1">Required for private/gated models. Stored locally only.</p>
      </div>
    </div>
  );
}

/**
 * Entitlement status and refresh panel
 */
function EntitlementPanel() {
  const proStatus = useAuthStore((s) => s.proStatus);
  const entitlementToken = useAuthStore((s) => s.entitlementToken);
  const deviceId = useAuthStore((s) => s.deviceId);
  const refreshLease = useAuthStore((s) => s.refreshLease);
  const setEntitlementToken = useAuthStore((s) => s.setEntitlementToken);
  const setProStatus = useAuthStore((s) => s.setProStatus);
  const { getToken } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [refreshSuccess, setRefreshSuccess] = useState(false);

  const handleRefresh = async () => {
    if (!deviceId) {
      setRefreshError('Device not registered');
      return;
    }
    setIsRefreshing(true);
    setRefreshError(null);
    setRefreshSuccess(false);
    try {
      const authToken = await getToken();
      if (!authToken) {
        throw new Error('Session expired. Please sign in again.');
      }

      const devicePublicKey = await invoke<string>('get_device_public_key').catch(() => null);
      const result = await refreshLease(authToken, deviceId, devicePublicKey ?? undefined);

      if (result?.token) {
        setEntitlementToken(result.token);
        await storeEntitlementToken(result.token).catch(() => {});
        await invoke('set_entitlement_token', { token: result.token });
      }

      const status = await invoke<ProStatus>('get_pro_status');
      setProStatus(status);
      setRefreshSuccess(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('SESSION_EXPIRED')) {
        setRefreshError('Session expired. Please sign in again.');
      } else {
        setRefreshError(message || 'Failed to refresh entitlement');
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const getStatusBadge = () => {
    if (!entitlementToken) {
      return <span className="text-2xs px-1.5 py-0.5 rounded bg-fg-dim/20 text-fg-dim">Not signed in</span>;
    }
    if (!proStatus) {
      return <span className="text-2xs px-1.5 py-0.5 rounded bg-fg-dim/20 text-fg-dim">Checking...</span>;
    }
    switch (proStatus?.status) {
      case 'active':
        return <span className="text-2xs px-1.5 py-0.5 rounded bg-accent-teal/20 text-accent-teal">Active</span>;
      case 'grace':
        return <span className="text-2xs px-1.5 py-0.5 rounded bg-accent-amber/20 text-accent-amber">Grace Period</span>;
      case 'expired':
        return <span className="text-2xs px-1.5 py-0.5 rounded bg-error/20 text-error">Expired</span>;
      case 'timeSuspect':
        return <span className="text-2xs px-1.5 py-0.5 rounded bg-accent-amber/20 text-accent-amber">Time Issue</span>;
      default:
        return <span className="text-2xs px-1.5 py-0.5 rounded bg-fg-dim/20 text-fg-dim">Free</span>;
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-graphite-2/55 backdrop-blur-md p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-accent-magenta" />
          <span className="text-sm font-medium text-porcelain">Pro Entitlement</span>
          {getStatusBadge()}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={handleRefresh}
          disabled={isRefreshing || !entitlementToken}
        >
          {isRefreshing ? (
            <>
              <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
              Refreshing...
            </>
          ) : (
            <>
              <RefreshCw className="w-3 h-3 mr-1.5" />
              Refresh
            </>
          )}
        </Button>
      </div>

      {proStatus && 'expiresAt' in proStatus && proStatus.expiresAt && (
        <div className="text-xs text-fg-dim mb-2">
          Expires: {new Date(proStatus.expiresAt * 1000).toLocaleDateString()}
        </div>
      )}

      {refreshSuccess && (
        <div className="text-xs text-accent-teal p-2 bg-accent-teal/10 border border-accent-teal/20 rounded">
          Entitlement refreshed successfully
        </div>
      )}

      {refreshError && (
        <div className="text-xs text-error p-2 bg-error/10 border border-error/20 rounded">
          {refreshError}
        </div>
      )}
    </div>
  );
}
