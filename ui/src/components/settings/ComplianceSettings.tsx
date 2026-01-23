import { CheckCircle, XCircle, FileText, Download, Trash2 } from 'lucide-react';
import { useSettingsStore } from '@/stores/settingsStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function ComplianceSettings() {
  const { consent, grantConsent, withdrawConsent, isLoading } = useSettingsStore();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text-primary mb-4">Compliance</h2>
        <p className="text-sm text-text-secondary">
          Manage your data rights under GDPR, CCPA, and EU AI Act regulations.
        </p>
      </div>

      {/* Consent Status */}
      <div className="bg-surface rounded-lg border border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {consent?.hasConsent ? (
              <CheckCircle className="w-5 h-5 text-secure" />
            ) : (
              <XCircle className="w-5 h-5 text-warning" />
            )}
            <div>
              <p className="text-sm font-medium text-text-primary">AI Processing Consent</p>
              <p className="text-xs text-text-muted mt-0.5">
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

        <div className="mt-4 pt-4 border-t border-border flex gap-2">
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
              variant="default"
              size="sm"
              onClick={grantConsent}
              disabled={isLoading}
            >
              Grant Consent
            </Button>
          )}
        </div>
      </div>

      {/* GDPR Rights */}
      <div className="bg-surface rounded-lg border border-border p-4">
        <h3 className="text-sm font-medium text-text-primary mb-3 flex items-center gap-2">
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

      {/* Transparency */}
      <div className="bg-surface rounded-lg border border-border p-4">
        <h3 className="text-sm font-medium text-text-primary mb-3">
          AI Transparency (EU AI Act)
        </h3>

        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-text-secondary">AI System</dt>
            <dd className="text-text-primary">Local Embedding Model</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-text-secondary">Model</dt>
            <dd className="text-text-primary font-mono text-xs">Model2Vec Potion Base 8M</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-text-secondary">Processing</dt>
            <dd className="text-text-primary">100% Local</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-text-secondary">Data Sent Externally</dt>
            <dd className="text-secure">None</dd>
          </div>
        </dl>
      </div>

      {/* Info */}
      <p className="text-2xs text-text-muted">
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
          : 'border-border hover:bg-elevated'
      }`}
    >
      <Icon
        className={`w-4 h-4 flex-shrink-0 ${
          variant === 'danger' ? 'text-danger' : 'text-text-tertiary'
        }`}
      />
      <div>
        <p className={`text-sm font-medium ${variant === 'danger' ? 'text-danger' : 'text-text-primary'}`}>
          {label}
        </p>
        <p className="text-xs text-text-muted">{description}</p>
      </div>
    </button>
  );
}
