import { Clock, Shield, AlertTriangle } from 'lucide-react';
import { useSettingsStore } from '@/stores/settingsStore';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

export function PrivacySettings() {
  const { config, updateConfig } = useSettingsStore();

  if (!config) {
    return <div className="text-text-muted">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text-primary mb-4">Privacy Settings</h2>
        <p className="text-sm text-text-secondary">
          Configure privacy and security options for sensitive searches.
        </p>
      </div>

      {/* Secure Timing */}
      <SettingCard
        icon={Clock}
        iconColor="text-amber-500"
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
        iconColor="text-green-500"
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
        iconColor="text-amber-500"
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

      {/* Privacy Notice */}
      <div className="bg-accent/5 border border-accent/20 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-text-primary font-medium mb-1">Your data stays local</p>
            <p className="text-text-secondary">
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
    <div className="bg-surface rounded-lg border border-border p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-3">
          <Icon className={cn('w-5 h-5 flex-shrink-0 mt-0.5', iconColor)} />
          <div>
            <p className="text-sm font-medium text-text-primary">{title}</p>
            <p className="text-xs text-text-muted mt-1">{description}</p>
          </div>
        </div>
        <div className="flex-shrink-0">{children}</div>
      </div>
    </div>
  );
}


