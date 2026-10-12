/**
 * Related Files Panel - Phase 2 Second Brain
 *
 * Shows related files for a selected search result:
 * - Co-Open: Files opened within 30 min of this file
 * - Co-Edit: Files edited in same session
 * - Similar: Content similarity (semantic)
 * - Backlinks: Files mentioning this filename
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Users, Edit3, Sparkles, Link2, ChevronDown, ExternalLink, Loader2 } from 'lucide-react';
import { useActivityStore } from '@/stores/activityStore';
import type { CoOccurrence, RankedResult, LexicalResult } from '@/lib/types';
import { cn } from '@/lib/utils';
type RelatedTab = 'co-open' | 'co-edit' | 'similar' | 'backlinks';
interface RelatedFilesData {
    coOpen: CoOccurrence[];
    coEdit: CoOccurrence[];
    similar: RankedResult[];
    backlinks: RankedResult[];
}
interface RelatedFilesPanelProps {
    result: RankedResult | LexicalResult;
    isExpanded: boolean;
    onToggle: () => void;
    onOpenFile?: (path: string) => void;
}
const tabConfig: Record<RelatedTab, {
    label: string;
    icon: typeof FileText;
    description: string;
}> = {
    'co-open': {
        label: 'Co-Open',
        icon: Users,
        description: 'Files opened together',
    },
    'co-edit': {
        label: 'Co-Edit',
        icon: Edit3,
        description: 'Files edited in same session',
    },
    similar: {
        label: 'Similar',
        icon: Sparkles,
        description: 'Content similarity',
    },
    backlinks: {
        label: 'Backlinks',
        icon: Link2,
        description: 'Files mentioning this file',
    },
};
export function RelatedFilesPanel({ result, isExpanded, onToggle, onOpenFile, }: RelatedFilesPanelProps) {
    const [activeTab, setActiveTab] = useState<RelatedTab>('co-open');
    const [data, setData] = useState<RelatedFilesData>({
        coOpen: [],
        coEdit: [],
        similar: [],
        backlinks: [],
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { getCoOccurrence } = useActivityStore();
    // Load related files when expanded
    useEffect(() => {
        if (!isExpanded)
            return;
        const loadRelatedFiles = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // Load co-occurrence data
                const coOccurrences = await getCoOccurrence(result.path, 30);
                // Separate co-open and co-edit based on reason
                const coOpen = coOccurrences.filter((c) => c.reason === 'co_open');
                const coEdit = coOccurrences.filter((c) => c.reason === 'co_edit');
                setData({
                    coOpen,
                    coEdit,
                    similar: [], // TODO: Load from semantic search
                    backlinks: [], // TODO: Load from backlink scan
                });
            }
            catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                // Don't show error for Pro capability - show lock instead
                if (!message.includes('Pro capability')) {
                    setError(message);
                }
            }
            finally {
                setIsLoading(false);
            }
        };
        loadRelatedFiles();
    }, [isExpanded, true, result.path, getCoOccurrence]);
    const getTabData = (tab: RelatedTab): (CoOccurrence | RankedResult)[] => {
        switch (tab) {
            case 'co-open':
                return data.coOpen;
            case 'co-edit':
                return data.coEdit;
            case 'similar':
                return data.similar;
            case 'backlinks':
                return data.backlinks;
            default:
                return [];
        }
    };
    const currentData = getTabData(activeTab);
    return (<div className="mt-3 pt-3 border-t border-stroke-hairline/50">
      {/* Toggle header */}
      <button onClick={onToggle} className={cn('w-full flex items-center justify-between py-2 px-1', 'text-fg-dim hover:text-fg-muted transition-colors')}>
        <span className="text-sm font-medium flex items-center gap-2">
          <Users className="w-4 h-4"/>
          Related Files
        </span>
        <ChevronDown className={cn('w-4 h-4 transition-transform', isExpanded && 'rotate-180')}/>
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (<motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-graphite-2/50 rounded-lg mt-2">
              {(Object.keys(tabConfig) as RelatedTab[]).map((tab) => {
                const config = tabConfig[tab];
                const tabData = getTabData(tab);
                const count = tabData.length;
                return (<button key={tab} onClick={() => setActiveTab(tab)} className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-md text-xs font-medium', 'transition-colors', activeTab === tab
                        ? 'bg-graphite-1 text-porcelain'
                        : 'text-fg-dim hover:text-fg-muted')}>
                    <config.icon className="w-3.5 h-3.5"/>
                    <span>{config.label}</span>
                    {count > 0 && (<span className={cn('px-1.5 py-0.5 rounded-full text-2xs', activeTab === tab
                            ? 'bg-accent-teal/20 text-accent-teal'
                            : 'bg-graphite-3 text-fg-ghost')}>
                        {count}
                      </span>)}
                  </button>);
            })}
            </div>

            {/* Content */}
            <div className="mt-3 min-h-[100px]">
              {isLoading ? (<div className="flex items-center justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-fg-dim"/>
                </div>) : error ? (<div className="text-center py-6 text-fg-dim text-sm">
                  {error}
                </div>) : currentData.length === 0 ? (<div className="text-center py-6 text-fg-dim text-sm">
                  No {tabConfig[activeTab].label.toLowerCase()} files found
                </div>) : (<div className="space-y-1">
                  {currentData.map((item, index) => {
                    const isCoOccurrence = 'fileId' in item;
                    const path = isCoOccurrence
                        ? (item as CoOccurrence).fileId // This is actually the file_id hash, we'd need path mapping
                        : (item as RankedResult).path;
                    const filename = path.split(/[/\\]/).pop() || path;
                    return (<button key={path + index} onClick={() => onOpenFile?.(path)} className={cn('w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left', 'hover:bg-graphite-2 transition-colors group')}>
                        <FileText className="w-4 h-4 text-fg-dim group-hover:text-accent-teal shrink-0"/>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-fg-muted group-hover:text-porcelain truncate">
                            {filename}
                          </p>
                          {isCoOccurrence && (<p className="text-xs text-fg-ghost">
                              {(item as CoOccurrence).count} times together
                            </p>)}
                        </div>

                        <ExternalLink className="w-3.5 h-3.5 text-fg-ghost opacity-0 group-hover:opacity-100 transition-opacity"/>
                      </button>);
                })}
                </div>)}
            </div>
          </motion.div>)}
      </AnimatePresence>
    </div>);
}
