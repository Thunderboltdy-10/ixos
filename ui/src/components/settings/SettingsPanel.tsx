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
    <div className="min-h-screen bg-graphite-0">
      <div className="bg-graphite-1/80 backdrop-blur-sm border-b border-stroke-hairline px-6 py-5">
        <h1 className="text-xl font-semibold text-porcelain">Settings</h1>
        <p className="text-sm text-fg-muted mt-1">
          Configure Ixos search behavior and privacy settings
        </p>
      </div>

      <div className="flex">
        <nav className="w-52 border-r border-stroke-hairline p-4 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs uppercase tracking-[0.16em] transition-colors',
                  activeTab === tab.id
                    ? 'bg-accent-teal/10 text-accent-teal'
                    : 'text-fg-dim hover:bg-graphite-2 hover:text-porcelain'
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>

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
        <h2 className="text-lg font-semibold text-porcelain mb-2">About Ixos</h2>
        <p className="text-fg-muted">
          Privacy-first semantic file search. Your data stays on your device.
        </p>
      </div>

      <div className="bg-graphite-2 rounded-lg p-4 border border-stroke-hairline">
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-fg-dim">Version</dt>
            <dd className="text-porcelain font-mono">0.1.0</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-fg-dim">License</dt>
            <dd className="text-porcelain">MIT / Apache 2.0</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-fg-dim">Website</dt>
            <dd>
              <a
                href="https://github.com/ixos/ixos-protocol"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-teal hover:underline"
              >
                github.com/ixos
              </a>
            </dd>
          </div>
        </dl>
      </div>

      <div className="text-2xs text-fg-dim">
        <p>Ixos Protocol - Privacy You Can See</p>
        <p className="mt-1">Copyright 2026 Ixos Team</p>
      </div>
    </div>
  );
}
