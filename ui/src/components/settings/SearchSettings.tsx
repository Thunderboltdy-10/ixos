import { useSettingsStore } from '@/stores/settingsStore';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';


export function SearchSettings() {
  const { config, updateConfig, resetConfig, isLoading } = useSettingsStore();

  if (!config) {
    return <div className="text-text-muted">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text-primary mb-4">Search Settings</h2>
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
          className="w-32 bg-surface-2 border border-border rounded-md px-2 py-1 text-sm text-text-primary"
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
          className="w-44 bg-surface-2 border border-border rounded-md px-2 py-1 text-sm text-text-primary"
        >
          <option value="ixos-pro-v1">Ixos Pro v1</option>
          <option value="ixos-flash-v2">Ixos Flash v2</option>
          <option value="potion">Potion 8M</option>
          <option value="qwen">Ixos Embedder v1 (Qwen)</option>
        </select>
      </SettingRow>

      {/* Show scores */}
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

      {/* Reset button */}
      <div className="pt-4 border-t border-border">
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
    <div className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
      <div>
        <p className="text-sm font-medium text-text-primary">{label}</p>
        <p className="text-xs text-text-muted mt-0.5">{description}</p>
      </div>
      {children}
    </div>
  );
}
