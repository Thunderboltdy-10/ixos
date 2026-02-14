import { CheckCircle, XCircle, FileText, Download, Trash2 } from 'lucide-react';
import { useSettingsStore } from '@/stores/settingsStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function ComplianceSettings() {
  const { consent, grantConsent, withdrawConsent, isLoading } = useSettingsStore();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-porcelain mb-4">Compliance</h2>
        <p className="text-sm text-fg-muted">
          Manage your data rights under GDPR, CCPA, and EU AI Act regulations.
        </p>
      </div>

      <div className="bg-graphite-2/55 backdrop-blur-md rounded-xl border border-white/10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {consent?.hasConsent ? (
              <CheckCircle className="w-5 h-5 text-success" />
            ) : (
              <XCircle className="w-5 h-5 text-warning" />
            )}
            <div>
              <p className="text-sm font-medium text-porcelain">AI Processing Consent</p>
              <p className="text-xs text-fg-dim mt-0.5">
                {consent?.hasConsent
                  ? 'You have consented to AI-powered search'
                  : 'Consent required for semantic search'}
              </p>
            </div>
          </div>
          <Badge variant={consent?.hasConsent ? 'secure' : 'warning'}>
            {consent?.hasConsent ? 'Granted' : 'Pending'}
          </Badge>
        </div>

        <div className="mt-4 pt-4 border-t border-stroke-hairline flex gap-2">
          {consent?.hasConsent ? (
            <Button
              variant="outline"
              size="sm"
              onClick={withdrawConsent}
              disabled={isLoading}
            >
              Withdraw Consent
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={grantConsent}
              disabled={isLoading}
            >
              Grant Consent
            </Button>
          )}
        </div>
      </div>

      <div className="bg-graphite-2/55 backdrop-blur-md rounded-xl border border-white/10 p-4">
        <h3 className="text-sm font-medium text-porcelain mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Your Data Rights (GDPR)
        </h3>

        <div className="space-y-2">
          <DataRightButton
            icon={Download}
            label="Export My Data"
            description="Download all data Ixos has about you"
            onClick={() => console.log('Export data')}
          />
          <DataRightButton
            icon={Trash2}
            label="Delete My Data"
            description="Permanently remove all cached data"
            onClick={() => console.log('Delete data')}
            variant="danger"
          />
        </div>
      </div>

      <div className="bg-graphite-2/55 backdrop-blur-md rounded-xl border border-white/10 p-4">
        <h3 className="text-sm font-medium text-porcelain mb-3">
          AI Transparency (EU AI Act)
        </h3>

        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-fg-dim">AI System</dt>
            <dd className="text-porcelain">Local Embedding Model</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-fg-dim">Model</dt>
            <dd className="text-porcelain font-mono text-xs">Ixos Flash / Ixos Pro (local embeddings)</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-fg-dim">Processing</dt>
            <dd className="text-porcelain">100% Local</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-fg-dim">Data Sent Externally</dt>
            <dd className="text-success">None</dd>
          </div>
        </dl>
      </div>

      <p className="text-2xs text-fg-dim">
        For questions about data processing, contact privacy@ixos.io
      </p>
    </div>
  );
}

interface DataRightButtonProps {
  icon: React.ElementType;
  label: string;
  description: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

function DataRightButton({
  icon: Icon,
  label,
  description,
  onClick,
  variant = 'default',
}: DataRightButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-md border text-left transition-colors ${
        variant === 'danger'
          ? 'border-danger/30 hover:bg-danger/5 hover:border-danger/50'
          : 'border-stroke-hairline hover:bg-graphite-3'
      }`}
    >
      <Icon
        className={`w-4 h-4 flex-shrink-0 ${
          variant === 'danger' ? 'text-danger' : 'text-fg-dim'
        }`}
      />
      <div>
        <p className={`text-sm font-medium ${variant === 'danger' ? 'text-danger' : 'text-porcelain'}`}>
          {label}
        </p>
        <p className="text-xs text-fg-dim">{description}</p>
      </div>
    </button>
  );
}
