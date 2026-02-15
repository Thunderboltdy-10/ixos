import { Clock, Shield, AlertTriangle } from 'lucide-react';
import { useSettingsStore } from '@/stores/settingsStore';
import { useStarredStore } from '@/stores/starredStore';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { invoke } from '@tauri-apps/api/core';

export function PrivacySettings() {
  const { config, updateConfig } = useSettingsStore();
  const clearAll = useStarredStore((s) => s.clearAll);

  if (!config) {
    return <div className="text-fg-dim">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-porcelain mb-4">Privacy Settings</h2>
        <p className="text-sm text-fg-muted">
          Configure privacy and security options for sensitive searches.
        </p>
      </div>

      {/* Secure Timing */}
      <SettingCard
        icon={Clock}
        iconColor="text-accent-amber"
        title="Secure Timing"
        description="Add a minimum processing time floor (100ms) to prevent timing attacks. Reduces performance but increases security."
      >
        <Switch
          checked={config.search.secureTiming}
          onCheckedChange={(checked) =>
            updateConfig({ search: { ...config.search, secureTiming: checked } })
          }
        />
      </SettingCard>

      {/* Integrity Verification */}
       <SettingCard
         icon={Shield}
         iconColor="text-success"
         title="Integrity Verification"
         description="Verify file integrity using SHA-256 hashes. Detects tampering and suspicious modifications."
       >
        <Switch
          checked={config.security.verifyIntegrity}
          onCheckedChange={(checked) =>
            updateConfig({ security: { ...config.security, verifyIntegrity: checked } })
          }
        />
      </SettingCard>

      <SettingCard
        icon={AlertTriangle}
        iconColor="text-accent-amber"
        title="Crash Telemetry (Opt-In)"
        description="Save local crash reports with timing-only diagnostics. No file content is included."
      >
        <Switch
          checked={config.security.telemetryOptIn}
          onCheckedChange={(checked) =>
            updateConfig({ security: { ...config.security, telemetryOptIn: checked } })
          }
        />
      </SettingCard>

      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-graphite-2/55 backdrop-blur-md p-4">
        <div>
          <p className="text-sm font-medium text-porcelain">Search History</p>
          <p className="text-xs text-fg-dim mt-1">Clear all saved search history on this device.</p>
        </div>
        <button
          onClick={() => {
            clearAll();
            invoke('clear_history').catch(() => { });
          }}
          className="px-4 py-2 bg-error/10 text-error rounded-md"
          type="button"
        >
          Clear All Search History
        </button>
      </div>

      {/* Privacy Notice */}
      <div className="rounded-xl border border-accent-amber/20 bg-accent-amber/10 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-accent-amber flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-porcelain font-medium mb-1">Your data stays local</p>
            <p className="text-fg-muted">
              Ixos processes all files locally on your device. No file content or search
              queries are ever sent to external servers. Embeddings are generated using
              a local model.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface SettingCardProps {
  icon: React.ElementType;
  iconColor: string;
  title: string;
  description: string;
  children: React.ReactNode;
}

function SettingCard({ icon: Icon, iconColor, title, description, children }: SettingCardProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-graphite-2/55 backdrop-blur-md p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-3">
          <Icon className={cn('w-5 h-5 flex-shrink-0 mt-0.5', iconColor)} />
          <div>
            <p className="text-sm font-medium text-porcelain">{title}</p>
            <p className="text-xs text-fg-dim mt-1">{description}</p>
          </div>
        </div>
        <div className="flex-shrink-0">{children}</div>
      </div>
    </div>
  );
}


