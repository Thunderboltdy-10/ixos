import { useEffect, useState } from 'react';
import { Settings, Shield, Scale, Info, Keyboard } from 'lucide-react';
import { useSettingsStore } from '@/stores/settingsStore';
import { cn } from '@/lib/utils';
import { SearchSettings } from './SearchSettings';
import { PrivacySettings } from './PrivacySettings';
import { ComplianceSettings } from './ComplianceSettings';
import { ShortcutSettings } from './ShortcutSettings';

type TabId = 'search' | 'keyboard' | 'privacy' | 'compliance' | 'about';

const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'search', label: 'Search', icon: Settings },
  { id: 'keyboard', label: 'Keyboard', icon: Keyboard },
  { id: 'privacy', label: 'Privacy', icon: Shield },
  { id: 'compliance', label: 'Compliance', icon: Scale },
  { id: 'about', label: 'About', icon: Info },
];

export function SettingsPanel() {
  const [activeTab, setActiveTab] = useState<TabId>('search');
  const { loadConfig, loadConsent } = useSettingsStore();

  useEffect(() => {
    loadConfig();
    loadConsent();
  }, [loadConfig, loadConsent]);

  return (
    <div className="min-h-screen bg-base">
      {/* Header - no longer sticky to prevent overlap */}
      <div className="bg-surface/80 backdrop-blur-sm border-b border-border px-6 py-4">
        <h1 className="text-xl font-semibold text-text-primary">Settings</h1>
        <p className="text-sm text-text-secondary mt-1">
          Configure Ixos search behavior and privacy settings
        </p>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <nav className="w-48 border-r border-border p-4 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                  activeTab === tab.id
                    ? 'bg-accent/10 text-accent'
                    : 'text-text-secondary hover:bg-elevated hover:text-text-primary'
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Content */}
        <main className="flex-1 p-6 max-w-2xl">
          {activeTab === 'search' && <SearchSettings />}
          {activeTab === 'keyboard' && <ShortcutSettings />}
          {activeTab === 'privacy' && <PrivacySettings />}
          {activeTab === 'compliance' && <ComplianceSettings />}
          {activeTab === 'about' && <AboutSection />}
        </main>
      </div>
    </div>
  );
}

function AboutSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text-primary mb-2">About Ixos</h2>
        <p className="text-text-secondary">
          Privacy-first semantic file search. Your data stays on your device.
        </p>
      </div>

      <div className="bg-surface rounded-lg p-4 border border-border">
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-text-secondary">Version</dt>
            <dd className="text-text-primary font-mono">0.1.0</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-text-secondary">License</dt>
            <dd className="text-text-primary">MIT / Apache 2.0</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-text-secondary">Website</dt>
            <dd>
              <a
                href="https://github.com/ixos/ixos-protocol"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                github.com/ixos
              </a>
            </dd>
          </div>
        </dl>
      </div>

      <div className="text-2xs text-text-muted">
        <p>Ixos Protocol - Privacy You Can See</p>
        <p className="mt-1">Copyright 2026 Ixos Team</p>
      </div>
    </div>
  );
}
