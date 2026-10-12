import { useSettingsStore } from "@/stores/settingsStore";
import { ProfileSwitcher } from "@/components/search/ProfileSwitcher";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
export function SearchSettings() {
  const { config, updateConfig, setProfile, error } = useSettingsStore();
  if (!config) return null;
  const search = config.search;
  const save = (patch: Partial<typeof search>) =>
    void updateConfig({ search: { ...search, ...patch } }).catch(() => {});
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div>
        <h2 className="text-xl font-semibold text-porcelain mb-2">Search</h2>
        <p className="text-fg-secondary">
          Preferences for your chosen locations.
        </p>
      </div>
      {error && (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      )}
      <div className="rounded-xl border border-white/10 bg-graphite-2/55 backdrop-blur-md p-4 space-y-5">
        <SettingRow
          label="Profile"
          description="Choose the model for your source material."
        >
          <ProfileSwitcher
            value={search.profile}
            onChange={(profile) => void setProfile(profile).catch(() => {})}
          />
        </SettingRow>
        <SettingRow
          label="Result limit"
          description="Maximum ranked files per search."
        >
          <Input
            aria-label="Result limit"
            type="number"
            min={1}
            max={10000}
            defaultValue={search.limit}
            key={`limit-${search.limit}`}
            onBlur={(event) => {
              const limit = Number(event.target.value);
              if (limit >= 1 && limit <= 10000) save({ limit });
            }}
            className="w-24"
          />
        </SettingRow>
        <SettingRow
          label="Snippet context"
          description="Lines on either side of the selected line."
        >
          <Input
            aria-label="Snippet context"
            type="number"
            min={0}
            max={100}
            defaultValue={search.context}
            key={`context-${search.context}`}
            onBlur={(event) => {
              const context = Number(event.target.value);
              if (context >= 0 && context <= 100) save({ context });
            }}
            className="w-24"
          />
        </SettingRow>
        <SettingRow
          label="Cache"
          description="Save embedding records for later searches."
        >
          <Switch
            checked={search.cache}
            onCheckedChange={(cache) => save({ cache })}
          />
        </SettingRow>
        <SettingRow
          label="Quit on close"
          description="Exit when the main window closes. Otherwise Ixos stays in the tray."
        >
          <Switch
            checked={config.quitOnClose}
            onCheckedChange={(quitOnClose) =>
              void updateConfig({ quitOnClose }).catch(() => {})
            }
          />
        </SettingRow>
      </div>
    </div>
  );
}
export function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-porcelain">{label}</p>
        <p className="text-xs text-fg-dim mt-1">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
