import { useEffect, useState } from 'react';
import { Settings, Shield, Scale, Info, Keyboard, User, Stethoscope } from 'lucide-react';
import { useSettingsStore } from '@/stores/settingsStore';
import { cn } from '@/lib/utils';
import { SearchSettings } from './SearchSettings';
import { PrivacySettings } from './PrivacySettings';
import { ComplianceSettings } from './ComplianceSettings';
import { ShortcutSettings } from './ShortcutSettings';
import { AccountSettings } from './AccountSettings';
import { DiagnosticsSettings } from './DiagnosticsSettings';

export type SettingsTabId =
  | 'search'
  | 'account'
  | 'keyboard'
  | 'privacy'
  | 'compliance'
  | 'diagnostics'
  | 'about';

const tabs: { id: SettingsTabId; label: string; icon: React.ElementType }[] = [
  { id: 'search', label: 'Search', icon: Settings },
  { id: 'account', label: 'Account', icon: User },
  { id: 'keyboard', label: 'Keyboard', icon: Keyboard },
  { id: 'privacy', label: 'Privacy', icon: Shield },
  { id: 'compliance', label: 'Compliance', icon: Scale },
  { id: 'diagnostics', label: 'Diagnostics', icon: Stethoscope },
  { id: 'about', label: 'About', icon: Info },
];

export function SettingsPanel({ initialTab, onUpgrade }: { initialTab?: SettingsTabId; onUpgrade?: () => void }) {
  const [activeTab, setActiveTab] = useState<SettingsTabId>(initialTab ?? 'search');
  const { loadConfig, loadConsent } = useSettingsStore();

  useEffect(() => {
    loadConfig();
    loadConsent();
  }, [loadConfig, loadConsent]);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  return (
    <div className="flex h-full bg-graphite-1/[0.985] backdrop-blur-xl border border-stroke-hairline rounded-2xl overflow-hidden shadow-2xl">
      {/* Sidebar Navigation */}
      <nav className="w-64 bg-graphite-2/88 border-r border-stroke-hairline p-4 flex flex-col gap-1.5">
        <div className="mb-6 px-3 pt-2">
          <h2 className="text-xl font-display font-semibold text-porcelain tracking-tight">Settings</h2>
          <p className="text-sm text-fg-secondary">Preferences & Controls</p>
        </div>

        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                // REDUCED SIZE: Changed text-base to text-[13px], gap-3 to gap-2.5
                'w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-[13px] font-medium border border-transparent transition-all duration-200',
                isActive
                  ? 'bg-accent-teal/10 border-accent-teal/20 text-accent-teal'
                  : 'text-fg-secondary hover:bg-graphite-2/70 hover:border-white/8 hover:text-porcelain cursor-pointer'
              )}
            >
              <Icon className={cn("w-4 h-4", isActive ? "text-accent-teal" : "text-fg-muted")} />
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* Main Content Area */}
      <main className="relative flex-1 overflow-y-auto bg-transparent">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.045] via-white/[0.018] to-transparent" />
        <div className="mx-auto max-w-4xl p-6 lg:p-8">
          {activeTab === 'search' && <SearchSettings />}
          {activeTab === 'account' && <AccountSettings onUpgrade={onUpgrade} />}
          {activeTab === 'keyboard' && <ShortcutSettings />}
          {activeTab === 'privacy' && <PrivacySettings />}
          {activeTab === 'compliance' && <ComplianceSettings />}
          {activeTab === 'diagnostics' && <DiagnosticsSettings />}
          {activeTab === 'about' && <AboutSection />}
        </div>
      </main>
    </div>
  );
}

function AboutSection() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div>
        <h2 className="text-xl font-semibold text-porcelain mb-2">About Ixos</h2>
        <p className="text-fg-secondary leading-relaxed">
          Ixos is a privacy-first semantic file search engine designed for speed and security.
          Your data never leaves your device, and all embeddings are calculated locally.
        </p>
      </div>

      <div className="bg-graphite-2/60 rounded-xl p-6 border border-stroke-hairline space-y-4">
        <div className="grid grid-cols-2 gap-y-4 text-sm">
          <div className="text-fg-muted">Version</div>
          <div className="text-porcelain font-mono">0.1.0</div>

          <div className="text-fg-muted">License</div>
          <div className="text-porcelain">MIT / Apache 2.0</div>

          <div className="text-fg-muted">Website</div>
          <div>
            <a
              href="https://github.com/ixos/ixos-protocol"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-teal hover:text-accent-teal-glow transition-colors"
            >
              github.com/ixos
            </a>
          </div>
          <div className="text-fg-muted">Build Target</div>
          <div className="text-porcelain font-mono">release-x86_64</div>
        </div>
      </div>

      <div className="text-xs text-fg-muted text-center pt-8 border-t border-stroke-hairline/50">
        <p>Ixos Protocol - Privacy You Can See</p>
        <p className="mt-1 opacity-60">Copyright 2026 Ixos Team</p>
      </div>
    </div>
  );
}
