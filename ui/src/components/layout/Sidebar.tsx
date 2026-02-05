import { useState } from 'react';
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
// import { getVariantId } from '@/lib/checkout';

// Navigation views for Phase 2 Second Brain
export type SidebarView = 'search' | 'today' | 'workstreams';

interface SidebarProps {
  onNewSearch?: () => void;
  onOpenGuide?: () => void;
  onOpenSettings?: (tab?: 'search' | 'account' | 'keyboard' | 'privacy' | 'compliance' | 'about') => void;
  onOpenPricing?: () => void;
  className?: string;
  // Phase 2: Second Brain navigation
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

  // Use real store data
  const stats = useStatsStore();
  const starred = useStarredStore();
  const searchStore = useSearchStore();
  const { user, entitlement, fetchBillingPortal } = useAuthStore();
  const { signOut, getToken } = useAuth();
  const journalistMode = searchStore.journalistMode;

  // Get starred threads
  const starredThreads = starred.getStarredThreads();
  const recentSearches = starred.getRecentThreads();

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

  const handleHistoryClick = (thread: SearchThread) => {
    searchStore.restoreFromHistory(thread);
  };

  const handleRecentClick = (item: SearchThread) => {
    searchStore.restoreFromHistory(item);
  };

  const handleDeleteRecent = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    starred.deleteThread(id);
  };

  const handleStarRecent = (item: SearchThread) => {
    starred.toggleStar(item.id);
  };

  const handleDeleteThread = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    starred.deleteThread(id);
  };

  const cacheHitRate = stats.getCacheHitRate() * 100;
  const showUpgrade = !!user && entitlement?.plan !== 'pro';

  const handleManageBilling = async () => {
    if (!user?.id) return;

    // Free users: open internal pricing panel
    if (entitlement?.plan !== 'pro') {
      onOpenPricing?.();
      return;
    }

    // Pro users: open billing portal (LemonSqueezy)
    const token = await getToken();
    if (!token) return;
    try {
      const { portalUrl } = await fetchBillingPortal(token);
      if (portalUrl) {
        await openExternalUrl(portalUrl);
      }
    } catch (error) {
      console.warn('Failed to open billing portal:', error);
    }
  };

  return (
    <aside className={cn('w-60 h-full flex flex-col bg-graphite-0 border-r border-stroke-hairline', className)}>
      {/* Brand header with New Search button */}
      <div className="p-4 flex items-center gap-3 pt-12 mb-2">
        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-accent-amber to-accent-amber-dim p-[1px] shadow-glow-amber">
          <div className="w-full h-full rounded-[5px] bg-graphite-1 flex items-center justify-center">
            <img src={ixosIcon} alt="Ixos" className="w-3.5 h-3.5" />
          </div>
        </div>
        <span className="font-display text-sm font-semibold text-porcelain tracking-tight">Ixos</span>
        <button
          type="button"
          onClick={onNewSearch}
          className={cn(
            'ml-auto p-1.5 rounded-md',
            'text-fg-muted hover:text-accent-amber hover:bg-white/[0.05]',
            'transition-colors duration-150 cursor-pointer'
          )}
          title="New Search"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Phase 2: Main navigation */}
      <div className="px-3 pb-3">
        <nav className="space-y-1">
          <NavItem
            icon={Search}
            label="Search"
            isActive={activeView === 'search'}
            onClick={() => onViewChange?.('search')}
          />
          <NavItem
            icon={Calendar}
            label="Today"
            isActive={activeView === 'today'}
            onClick={() => onViewChange?.('today')}
            isPro
            isLocked={entitlement?.plan !== 'pro'}
            onLockedClick={onOpenPricing}
          />
          <NavItem
            icon={Layers}
            label="Workstreams"
            isActive={activeView === 'workstreams'}
            onClick={() => onViewChange?.('workstreams')}
            isPro
            isLocked={entitlement?.plan !== 'pro'}
            onLockedClick={onOpenPricing}
          />
        </nav>
      </div>

      {/* Tab toggle for history (only show on search view) */}
      {activeView === 'search' && (
      <div className="px-3 pb-3">
        <div className="flex items-center p-1 bg-graphite-2/40 border border-white/[0.04] rounded-lg">
          <button
            type="button"
            onClick={() => setActiveTab('recent')}
            className={cn(
              'flex-1 py-1.5 px-2 text-xs font-medium rounded-md transition-all duration-200',
              activeTab === 'recent'
                ? 'bg-graphite-3 text-porcelain shadow-sm ring-1 ring-white/[0.04]'
                : 'text-fg-dim hover:text-fg-muted hover:bg-white/[0.02]'
            )}
          >
            Recent
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('starred')}
            className={cn(
              'flex-1 py-1.5 px-2 text-xs font-medium rounded-md transition-all duration-200 flex items-center justify-center gap-1.5',
              activeTab === 'starred'
                ? 'bg-graphite-3 text-accent-amber shadow-sm ring-1 ring-white/[0.04]'
                : 'text-fg-dim hover:text-fg-muted hover:bg-white/[0.02]'
            )}
          >
            <Star className={cn("w-3 h-3", activeTab === 'starred' ? "fill-accent-amber" : "")} />
            Starred
          </button>
        </div>
      </div>
      )}

      {/* Journalist mode notice - Only show when in Recent tab and search view */}
      {journalistMode && activeTab === 'recent' && activeView === 'search' && (
        <div className="mx-3 mt-3 px-3 py-2 bg-accent-violet/5 border border-accent-violet/10 rounded-md">
          <div className="flex items-start gap-2">
            <EyeOff className="w-3.5 h-3.5 text-accent-violet flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-accent-violet">Journalist Mode Active</p>
              <p className="text-2xs text-fg-muted leading-tight">Searches are encrypted locally and can be cleared instantly.</p>
            </div>
          </div>
        </div>
      )}

      {showUpgrade && <UpgradeBanner onUpgrade={onOpenPricing} />}

      {/* Search history list (only show on search view) */}
      {activeView === 'search' && (
      <nav className="flex-1 overflow-y-auto px-2 pt-2 scrollbar-hide">
        {activeTab === 'recent' ? (
          // Recent searches from history store
          recentSearches.length === 0 ? (
            <div className="px-2 py-8 text-center">
              <Clock className="w-6 h-6 mx-auto mb-2 text-fg-ghost" />
              <p className="text-xs text-fg-dim">No recent searches</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {recentSearches.map((item) => (
                <RecentSearchItem
                  key={item.id}
                  item={item}
                  isHovered={hoveredId === `recent-${item.id}`}
                  onHover={() => setHoveredId(`recent-${item.id}`)}
                  onLeave={() => setHoveredId(null)}
                  onStar={() => handleStarRecent(item)}
                  onSearch={() => handleRecentClick(item)}
                  formatTime={formatTime}
                  onDelete={(e) => handleDeleteRecent(e, item.id)}
                />
              ))}
            </div>
          )
        ) : (
          // Starred searches
          starredThreads.length === 0 ? (
            <div className="px-2 py-8 text-center">
              <Star className="w-6 h-6 mx-auto mb-2 text-fg-ghost" />
              <p className="text-xs text-fg-dim">No starred searches</p>
              <p className="text-2xs text-fg-ghost mt-1">Star a search to save it here</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {starredThreads.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => handleHistoryClick(item)}
                  onMouseEnter={() => setHoveredId(item.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className={cn(
                    'w-full px-2 py-2 rounded-md text-left',
                    'hover:bg-graphite-1 transition-colors duration-150',
                    'group cursor-pointer relative'
                  )}
                >
                  <div className="flex items-start gap-2">
                    <Star className="w-3.5 h-3.5 text-accent-amber mt-0.5 flex-shrink-0 fill-accent-amber" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-porcelain truncate transition-colors">
                        {item.query}
                      </p>
                      <div className="flex items-center gap-1.5 text-2xs text-fg-ghost mt-0.5">
                        <span>{item.resultCount} results</span>
                        <span>-</span>
                        <span>{formatTime(item.timestamp)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Delete button on hover */}
                  <AnimatePresence>
                    {hoveredId === item.id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.1 }}
                        className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1"
                      >
                        <motion.button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            starred.toggleStar(item.id);
                          }}
                          className={cn(
                            'p-1 rounded',
                            'hover:bg-graphite-2 text-accent-amber',
                            'transition-colors duration-150'
                          )}
                          title="Unstar"
                        >
                          <Star className="w-3 h-3 fill-current" />
                        </motion.button>
                        <motion.button
                          type="button"
                          onClick={(e) => handleDeleteThread(e, item.id)}
                          className={cn(
                            'p-1 rounded',
                            'hover:bg-graphite-2 text-fg-ghost hover:text-error',
                            'transition-colors duration-150'
                          )}
                          title="Remove"
                        >
                          <Trash2 className="w-3 h-3" />
                        </motion.button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
              ))}
            </div>
          )
        )}
      </nav>
      )}

      {/* Guide button */}
      <div className="px-3 py-2 border-t border-stroke-hairline">
        <button
          type="button"
          onClick={() => onOpenGuide?.()}
          className={cn(
            'w-full py-2 px-3 rounded-md text-left',
            'flex items-center gap-2',
            'text-fg-dim hover:text-porcelain hover:bg-graphite-1',
            'transition-colors duration-150 cursor-pointer'
          )}
        >
          <BookOpen className="w-3.5 h-3.5 text-accent-amber" />
          <span className="text-xs">Guide</span>
          <span className="ml-auto rounded bg-graphite-2 px-1.5 py-0.5 text-2xs text-fg-ghost">
            Ctrl+K
          </span>
        </button>
      </div>

      {/* Account footer */}
      {user && (
        <div className="px-3 py-3 border-t border-stroke-hairline">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-graphite-2 border border-stroke-hairline flex items-center justify-center text-2xs text-fg-muted">
              {user.email.slice(0, 1).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-fg-muted truncate">{user.email}</p>
            </div>
            {entitlement && <PlanBadge plan={entitlement.plan} />}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onOpenSettings?.('account')}
              className="py-1.5 px-2 rounded-md text-2xs bg-graphite-2 text-fg-muted hover:text-porcelain hover:bg-graphite-3 transition-colors"
            >
              Account
            </button>
            {entitlement?.plan === 'pro' ? (
              <button
                type="button"
                onClick={handleManageBilling}
                className="py-1.5 px-2 rounded-md text-2xs bg-accent-teal/15 text-accent-teal hover:bg-accent-teal/25 transition-colors"
              >
                Billing
              </button>
            ) : (
              <button
                type="button"
                onClick={handleManageBilling}
                className="py-1.5 px-2 rounded-md text-2xs bg-accent-magenta/20 text-accent-magenta hover:bg-accent-magenta/30 transition-colors"
              >
                Upgrade
              </button>
            )}
            <button
              type="button"
              onClick={() => signOut()}
              className="col-span-2 py-1.5 px-2 rounded-md text-2xs bg-graphite-2 text-fg-muted hover:text-porcelain hover:bg-graphite-3 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Stats footer - single compact line */}
      <div className="px-4 py-3 border-t border-stroke-hairline">
        <div className="flex items-center justify-between gap-2">
          <p className="text-2xs text-fg-ghost font-mono">
            {stats.totalSearches > 0 ? (
              <>
                {stats.totalSearches} searches
                {cacheHitRate > 0 && (
                  <> - <span className="text-accent-amber">{cacheHitRate.toFixed(0)}%</span> cache</>
                )}
              </>
            ) : (
              'Ready to search'
            )}
          </p>
          <span className="rounded bg-graphite-2 px-1.5 py-0.5 text-2xs text-fg-ghost">Ctrl+K</span>
        </div>
      </div>
    </aside>
  );
}

// Component for recent search items
function RecentSearchItem({
  item,
  isHovered,
  onHover,
  onLeave,
  onStar,
  onSearch,
  formatTime,
  onDelete,
}: {
  item: SearchThread;
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
  onStar: () => void;
  onSearch: () => void;
  formatTime: (ts: number) => string;
  onDelete: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      onClick={onSearch}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className={cn(
        'w-full px-2 py-2 rounded-md text-left',
        'hover:bg-graphite-1 transition-colors duration-150',
        'group cursor-pointer relative'
      )}
    >
      <div className="flex items-start gap-2">
        <FileText className="w-3.5 h-3.5 text-fg-ghost mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-porcelain truncate transition-colors">
            {item.query}
          </p>
          <div className="flex items-center gap-1.5 text-2xs text-fg-ghost mt-0.5">
            <span>{item.resultCount} results</span>
            <span>-</span>
            <span>{formatTime(item.timestamp)}</span>
          </div>
        </div>
      </div>

      {/* Star button on hover */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.1 }}
            className="flex items-center gap-1 absolute right-1 top-1/2 -translate-y-1/2"
          >
            <motion.button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onStar();
              }}
              className={cn(
                'p-1 rounded',
                'hover:bg-graphite-2 text-fg-ghost hover:text-accent-amber',
                'transition-colors duration-150'
              )}
              title="Star this search"
            >
              <Star className="w-3 h-3" />
            </motion.button>

            <motion.button
              type="button"
              onClick={onDelete}
              className={cn(
                'p-1 rounded',
                'hover:bg-graphite-2 text-fg-ghost hover:text-error',
                'transition-colors duration-150'
              )}
              title="Remove from history"
            >
              <Trash2 className="w-3 h-3" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}

// Navigation item component for Phase 2 main nav
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
        'w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-left',
        'transition-colors duration-150',
        isActive
          ? 'bg-graphite-2 text-porcelain'
          : 'text-fg-muted hover:text-porcelain hover:bg-graphite-1',
        isLocked && 'opacity-60'
      )}
    >
      <Icon className={cn(
        'w-4 h-4',
        isActive ? 'text-accent-teal' : 'text-fg-dim'
      )} />
      <span className="text-sm flex-1">{label}</span>
      {isPro && (
        isLocked ? (
          <Lock className="w-3 h-3 text-fg-ghost" />
        ) : (
          <span className="text-2xs text-accent-teal">Pro</span>
        )
      )}
    </button>
  );
}
