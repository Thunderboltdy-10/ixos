import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, FileText, Clock, Trash2, Star, BookOpen, EyeOff, Calendar, Layers, Search, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStatsStore } from '@/stores/statsStore';
import { useStarredStore, type SearchThread } from '@/stores/starredStore';
import { useSearchStore } from '@/stores/searchStore';
import ixosIcon from '@/assets/ixos-icon.png';
import { useAuthStore } from '@/stores/authStore';
import { PlanBadge } from '@/components/account/PlanBadge';
import { UpgradeBanner } from '@/components/account/UpgradeBanner';
import { openExternalUrl } from '@/lib/tauri';
import { useAuth } from '@clerk/clerk-react';
import { hasProAccess } from '@/lib/proAccess';

export type SidebarView = 'search' | 'today' | 'workstreams';

interface SidebarProps {
  onNewSearch?: () => void;
  onOpenGuide?: () => void;
  onOpenSettings?: (tab?: 'search' | 'account' | 'keyboard' | 'privacy' | 'compliance' | 'about') => void;
  onOpenPricing?: () => void;
  className?: string;
  activeView?: SidebarView;
  onViewChange?: (view: SidebarView) => void;
}

export function Sidebar({
  onNewSearch,
  onOpenGuide,
  onOpenSettings,
  onOpenPricing,
  className,
  activeView = 'search',
  onViewChange,
}: SidebarProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'recent' | 'starred'>('recent');
  const [historyFilter, setHistoryFilter] = useState('');

  const stats = useStatsStore();
  const starred = useStarredStore();
  const searchStore = useSearchStore();
  const { user, entitlement, proStatus, entitlementToken, fetchBillingPortal } = useAuthStore();
  const { signOut, getToken } = useAuth();
  const deepSearchMode = searchStore.deepSearchMode;

  const starredThreads = starred.getStarredThreads();
  const recentSearches = starred.getRecentThreads();
  const isPro = hasProAccess(entitlement, entitlementToken, proStatus);
  const showUpgrade = !!user && !isPro;
  const cacheHitRate = stats.getCacheHitRate() * 100;

  const filteredRecent = useMemo(() => {
    if (!historyFilter.trim()) return recentSearches;
    const q = historyFilter.toLowerCase();
    return recentSearches.filter((item) => item.query.toLowerCase().includes(q));
  }, [recentSearches, historyFilter]);

  const filteredStarred = useMemo(() => {
    if (!historyFilter.trim()) return starredThreads;
    const q = historyFilter.toLowerCase();
    return starredThreads.filter((item) => item.query.toLowerCase().includes(q));
  }, [starredThreads, historyFilter]);

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return 'now';
  };

  const handleManageBilling = async () => {
    if (!user?.id) return;
    if (!isPro) {
      onOpenPricing?.();
      return;
    }
    const token = await getToken();
    if (!token) return;
    try {
      const { portalUrl } = await fetchBillingPortal(token);
      if (portalUrl) await openExternalUrl(portalUrl);
    } catch (error) {
      console.warn('Failed to open billing portal:', error);
    }
  };

  return (
    <aside className={cn('w-60 h-full flex flex-col bg-graphite-0 border-r border-white/[0.06]', className)}>
      {/* Brand + New Search */}
      <div className="px-4 pt-12 pb-4 flex items-center gap-2.5">
        <img src={ixosIcon} alt="Ixos" className="w-7 h-7 object-contain" />
        <span className="font-display text-sm font-semibold text-porcelain tracking-tight">Ixos</span>
        <button
          type="button"
          onClick={onNewSearch}
          className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-accent-teal/10 text-accent-teal border border-accent-teal/20 hover:bg-accent-teal/18 transition-colors duration-150"
        >
          <Plus className="w-3 h-3" />
          New
        </button>
      </div>

      {/* Main nav */}
      <nav className="px-3 pb-3 space-y-0.5">
        <NavItem icon={Search} label="Search" isActive={activeView === 'search'} onClick={() => onViewChange?.('search')} />
        <NavItem icon={Calendar} label="Today" isActive={activeView === 'today'} onClick={() => onViewChange?.('today')} isPro isLocked={!isPro} onLockedClick={onOpenPricing} />
        <NavItem icon={Layers} label="Workstreams" isActive={activeView === 'workstreams'} onClick={() => onViewChange?.('workstreams')} isPro isLocked={!isPro} onLockedClick={onOpenPricing} />
      </nav>

      {/* Tab toggle */}
      <div className="px-3 pb-2">
        <div className="flex items-center gap-0.5 p-0.5 bg-graphite-2/30 rounded-md">
          <button
            type="button"
            onClick={() => setActiveTab('recent')}
            className={cn(
              'flex-1 py-1.5 px-2 text-[10px] font-medium rounded transition-all duration-150',
              activeTab === 'recent' ? 'bg-graphite-3/60 text-porcelain shadow-sm' : 'text-fg-muted hover:text-porcelain'
            )}
          >
            Recent
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('starred')}
            className={cn(
              'flex-1 py-1.5 px-2 text-[10px] font-medium rounded transition-all duration-150 flex items-center justify-center gap-1',
              activeTab === 'starred' ? 'bg-graphite-3/60 text-accent-amber shadow-sm' : 'text-fg-muted hover:text-porcelain'
            )}
          >
            <Star className={cn("w-2.5 h-2.5", activeTab === 'starred' && "fill-accent-amber")} />
            Starred
          </button>
        </div>
      </div>

      {/* Searchable history filter */}
      <div className="px-3 pb-2">
        <input
          type="text"
          value={historyFilter}
          onChange={(e) => setHistoryFilter(e.target.value)}
          placeholder="Filter history..."
          className="w-full px-2.5 py-1.5 rounded-md text-[11px] bg-[#1a1a24] border border-white/10 text-porcelain placeholder:text-fg-dim focus:border-accent-teal/50 focus:outline-none transition-colors"
        />
      </div>

      {/* Deep Search notice */}
      {deepSearchMode && activeTab === 'recent' && (
        <div className="mx-3 mb-2 px-2.5 py-2 bg-accent-violet/5 border border-accent-violet/10 rounded-md flex items-start gap-2">
          <EyeOff className="w-3 h-3 text-accent-violet flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[10px] font-medium text-accent-violet">Deep Search Active</p>
            <p className="text-[10px] text-fg-muted leading-tight mt-0.5">Local privacy profile with deeper evidence.</p>
          </div>
        </div>
      )}

      {showUpgrade && <UpgradeBanner onUpgrade={onOpenPricing} />}

      {/* History list */}
      <nav className="flex-1 overflow-y-auto px-2 pt-1 scrollbar-hide">
        {activeTab === 'recent' ? (
          filteredRecent.length === 0 ? (
            <div className="px-2 py-8 text-center">
              <Clock className="w-5 h-5 mx-auto mb-2 text-fg-ghost" />
              <p className="text-[11px] text-fg-dim">{historyFilter ? 'No matches' : 'No recent searches'}</p>
            </div>
          ) : (
            <div className="space-y-px">
              {filteredRecent.map((item) => (
                <HistoryRow
                  key={item.id}
                  item={item}
                  isHovered={hoveredId === `recent-${item.id}`}
                  onHover={() => setHoveredId(`recent-${item.id}`)}
                  onLeave={() => setHoveredId(null)}
                  onSearch={() => searchStore.restoreFromHistory(item)}
                  onStar={() => starred.toggleStar(item.id)}
                  onDelete={(e) => { e.stopPropagation(); starred.deleteThread(item.id); }}
                  formatTime={formatTime}
                  isStarred={false}
                />
              ))}
            </div>
          )
        ) : (
          filteredStarred.length === 0 ? (
            <div className="px-2 py-8 text-center">
              <Star className="w-5 h-5 mx-auto mb-2 text-fg-ghost" />
              <p className="text-[11px] text-fg-dim">{historyFilter ? 'No matches' : 'No starred searches'}</p>
            </div>
          ) : (
            <div className="space-y-px">
              {filteredStarred.map((item) => (
                <HistoryRow
                  key={item.id}
                  item={item}
                  isHovered={hoveredId === item.id}
                  onHover={() => setHoveredId(item.id)}
                  onLeave={() => setHoveredId(null)}
                  onSearch={() => searchStore.restoreFromHistory(item)}
                  onStar={() => starred.toggleStar(item.id)}
                  onDelete={(e) => { e.stopPropagation(); starred.deleteThread(item.id); }}
                  formatTime={formatTime}
                  isStarred
                />
              ))}
            </div>
          )
        )}
      </nav>

      {/* Guide */}
      <div className="px-3 py-1.5">
        <button
          type="button"
          onClick={() => onOpenGuide?.()}
          className="w-full py-1.5 px-2.5 rounded-md text-left flex items-center gap-2 text-fg-dim hover:text-porcelain hover:bg-graphite-2/40 transition-colors duration-150"
        >
          <BookOpen className="w-3.5 h-3.5 text-accent-amber" />
          <span className="text-[12px]">Guide</span>
        </button>
      </div>

      {/* Account footer */}
      {user && (
        <div className="px-3 py-2.5 border-t border-white/[0.04] space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-graphite-2 border border-white/[0.06] flex items-center justify-center text-[10px] text-fg-muted font-medium">
              {user.email.slice(0, 1).toUpperCase()}
            </div>
            <p className="text-[11px] text-fg-muted truncate flex-1">{user.email}</p>
            {entitlement && <PlanBadge plan={entitlement.plan} />}
          </div>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => onOpenSettings?.('account')}
              className="flex-1 py-1.5 rounded-md text-[10px] text-fg-muted hover:text-porcelain bg-graphite-2/40 hover:bg-graphite-3/50 transition-colors">
              Settings
            </button>
            {isPro ? (
              <button type="button" onClick={handleManageBilling}
                className="flex-1 py-1.5 rounded-md text-[10px] text-accent-teal bg-accent-teal/8 hover:bg-accent-teal/15 transition-colors">
                Billing
              </button>
            ) : (
              <button type="button" onClick={onOpenPricing}
                className="flex-1 py-1.5 rounded-md text-[10px] text-accent-violet bg-accent-violet/8 hover:bg-accent-violet/15 transition-colors">
                Upgrade
              </button>
            )}
            <button type="button" onClick={() => signOut()}
              className="py-1.5 px-2 rounded-md text-[10px] text-fg-ghost hover:text-fg-muted bg-graphite-2/40 hover:bg-graphite-3/50 transition-colors">
              Out
            </button>
          </div>
        </div>
      )}

      {/* Stats footer */}
      <div className="px-3 py-2 border-t border-white/[0.04]">
        <p className="text-[10px] text-fg-ghost font-mono">
          {stats.totalSearches > 0 ? (
            <>
              {stats.totalSearches} searches
              {cacheHitRate > 0 && (<> · <span className="text-accent-amber">{cacheHitRate.toFixed(0)}%</span> cache</>)}
            </>
          ) : (
            'Ready to search'
          )}
        </p>
      </div>
    </aside>
  );
}

function HistoryRow({
  item, isHovered, onHover, onLeave, onSearch, onStar, onDelete, formatTime, isStarred,
}: {
  item: SearchThread;
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
  onSearch: () => void;
  onStar: () => void;
  onDelete: (e: React.MouseEvent) => void;
  formatTime: (ts: number) => string;
  isStarred: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSearch}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className="w-full px-2 py-1.5 rounded-md text-left hover:bg-graphite-1/50 transition-colors duration-150 group cursor-pointer relative"
    >
      <div className="flex items-center gap-2">
        {isStarred ? (
          <Star className="w-3 h-3 text-accent-amber fill-accent-amber flex-shrink-0" />
        ) : (
          <FileText className="w-3 h-3 text-fg-ghost flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[12px] text-porcelain truncate">{item.query}</p>
          <p className="text-[10px] text-fg-ghost mt-0.5">
            {item.resultCount} results · {formatTime(item.timestamp)}
          </p>
        </div>
      </div>

      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.1 }}
            className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5"
          >
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onStar(); }}
              className={cn(
                'p-1 rounded hover:bg-graphite-2 transition-colors duration-150',
                isStarred ? 'text-accent-amber' : 'text-fg-ghost hover:text-accent-amber'
              )}
              title={isStarred ? 'Unstar' : 'Star'}
            >
              <Star className={cn("w-2.5 h-2.5", isStarred && "fill-current")} />
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="p-1 rounded hover:bg-graphite-2 text-fg-ghost hover:text-error transition-colors duration-150"
              title="Remove"
            >
              <Trash2 className="w-2.5 h-2.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  onClick: () => void;
  isPro?: boolean;
  isLocked?: boolean;
  onLockedClick?: () => void;
}

function NavItem({ icon: Icon, label, isActive, onClick, isPro, isLocked, onLockedClick }: NavItemProps) {
  const handleClick = () => {
    if (isLocked) {
      onLockedClick?.();
    } else {
      onClick();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left',
        'transition-all duration-150',
        isActive
          ? 'text-porcelain bg-graphite-2/40 border-l-2 border-accent-teal ml-0'
          : 'text-fg-muted hover:text-porcelain hover:bg-graphite-2/25 border-l-2 border-transparent',
        isLocked && 'opacity-55'
      )}
    >
      <Icon className={cn('w-3.5 h-3.5', isActive ? 'text-accent-teal' : 'text-fg-dim')} />
      <span className="text-[12px] font-medium flex-1">{label}</span>
      {isPro && (
        isLocked ? (
          <Lock className="w-3 h-3 text-fg-ghost" />
        ) : (
          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-accent-teal/12 text-accent-teal border border-accent-teal/20">
            Pro
          </span>
        )
      )}
    </button>
  );
}
