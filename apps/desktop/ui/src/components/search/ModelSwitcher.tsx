import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Beaker, Wand2, ChevronDown, Check, AlertCircle, Loader2, DownloadCloud } from 'lucide-react';
import { invoke, type InvokeArgs } from '@tauri-apps/api/core';
import { cn } from '@/lib/utils';
import type { ModelType } from '@/lib/types';
export type { ModelType };

interface ModelSwitcherProps {
  value: ModelType;
  onChange: (model: ModelType) => void | Promise<void>;
  className?: string;
}

interface ModelStatus {
  ixosFlashV2Available: boolean;
  ixosFlashV2Path: string | null;
  ixosProV2Available: boolean;
  ixosProV2Path: string | null;
  ixosFlashV1Available: boolean;
  ixosFlashV1Path: string | null;
  ixosProV1Available: boolean;
  ixosProV1Path: string | null;
  anyAvailable: boolean;
  recommended: string | null;
  loadedModel: string | null;
}

interface ModelOption {
  id: ModelType;
  label: string;
  description: string;
  details: string;
  available: boolean;
  recommended?: boolean;
  icon: React.ElementType;
  color: string;
}

interface FloatingMenuMetrics {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function ModelSwitcher({ value, onChange, className }: ModelSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>('bottom');
  const [menuMetrics, setMenuMetrics] = useState<FloatingMenuMetrics | null>(null);
  const [status, setStatus] = useState<ModelStatus | null>(null);
  const [preloadingModel, setPreloadingModel] = useState<ModelType | null>(null);
  const [downloadingModel, setDownloadingModel] = useState<ModelType | null>(null);
  const [currentLoadedModel, setCurrentLoadedModel] = useState<ModelType | null>(null);
  const [hoveredModelId, setHoveredModelId] = useState<ModelType>(value);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const safeInvoke = async <T,>(cmd: string, args?: InvokeArgs): Promise<T | null> => {
    try {
      if (typeof window !== 'undefined' && '__TAURI__' in window) {
        return await invoke<T>(cmd, args);
      }
      const { invoke: tauriInvoke } = await import('@tauri-apps/api/core');
      return await tauriInvoke<T>(cmd, args);
    } catch (e) {
      console.log(`Tauri invoke '${cmd}' failed (browser mode):`, e);
      return null;
    }
  };

  const models: ModelOption[] = useMemo(() => [
    {
      id: 'ixos-flash-v2',
      label: 'Ixos Flash',
      description: 'Fastest path for iterative discovery',
      details: 'Best for quick recall and low-latency iteration.',
      available: status?.ixosFlashV2Available ?? false,
      recommended: status?.recommended === 'ixos-flash-v2',
      icon: Beaker,
      color: 'text-accent-teal',
    },
    {
      id: 'ixos-pro-v2',
      label: 'Ixos Pro',
      description: 'Highest precision with deeper evidence',
      details: 'Best for difficult queries that need richer evidence extraction.',
      available: status?.ixosProV2Available ?? false,
      recommended: status?.recommended === 'ixos-pro-v2',
      icon: Wand2,
      color: 'text-accent-magenta',
    },
  ], [status]);

  const hoveredModel = models.find((model) => model.id === hoveredModelId) ?? models[0];
  const selectedModel = models.find((model) => model.id === value) || models[0];
  const SelectedIcon = selectedModel.icon;
  const noModelsAvailable = status ? !status.anyAvailable : false;

  useEffect(() => {
    if (!isOpen) {
      setHoveredModelId(value);
      return;
    }

    const updateMenuMetrics = () => {
      const buttonRect = buttonRef.current?.getBoundingClientRect();
      if (!buttonRect) return;

      const margin = 12;
      const preferredWidth = 400;
      const rowHeight = 56;
      const footerHeight = 72;
      const warningHeight = noModelsAvailable ? 36 : 0;
      const estimatedHeight = rowHeight * models.length + footerHeight + warningHeight + 20;
      const spaceBelow = window.innerHeight - buttonRect.bottom;
      const spaceAbove = buttonRect.top;
      const shouldOpenTop = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;
      const availableHeight = shouldOpenTop
        ? Math.max(190, spaceAbove - margin - 8)
        : Math.max(190, window.innerHeight - buttonRect.bottom - margin - 8);
      const width = Math.min(preferredWidth, window.innerWidth - margin * 2);
      const left = clamp(buttonRect.right - width, margin, Math.max(margin, window.innerWidth - width - margin));
      const top = shouldOpenTop
        ? Math.max(margin, buttonRect.top - 8 - availableHeight)
        : Math.min(window.innerHeight - margin - availableHeight, buttonRect.bottom + 8);

      setDropdownPosition(shouldOpenTop ? 'top' : 'bottom');
      setMenuMetrics({
        top,
        left,
        width,
        maxHeight: availableHeight,
      });
    };

    updateMenuMetrics();
    window.addEventListener('resize', updateMenuMetrics);
    window.addEventListener('scroll', updateMenuMetrics, true);
    return () => {
      window.removeEventListener('resize', updateMenuMetrics);
      window.removeEventListener('scroll', updateMenuMetrics, true);
    };
  }, [isOpen, value, noModelsAvailable, models.length]);

  const handleSelect = async (model: ModelType) => {
    const modelOption = models.find((item) => item.id === model);
    if (!modelOption?.available) return;

    setIsOpen(false);
    await onChange(model);

    if (model !== currentLoadedModel) {
      setPreloadingModel(model);
      try {
        await safeInvoke('preload_model', { modelType: model });
        setCurrentLoadedModel(model);
      } catch (err) {
        console.warn('Failed to preload model:', err);
      } finally {
        setPreloadingModel(null);
      }
    }
  };

  const handleDownload = async (e: React.MouseEvent, model: ModelType) => {
    e.stopPropagation();
    setDownloadingModel(model);
    try {
      await safeInvoke('download_model', { modelType: model });
      const result = await safeInvoke<ModelStatus>('get_model_status');
      if (result) setStatus(result);
    } catch (err) {
      console.error('Failed to download model:', err);
    } finally {
      setDownloadingModel(null);
    }
  };

  useEffect(() => {
    async function fetchStatus() {
      try {
        const result = await safeInvoke<ModelStatus>('get_model_status');
        if (result) {
          setStatus(result);
          if (result.loadedModel) {
            setCurrentLoadedModel(result.loadedModel as ModelType);
          }
        } else {
          setStatus({
            ixosFlashV2Available: true,
            ixosFlashV2Path: 'mock/path',
            ixosProV2Available: true,
            ixosProV2Path: 'mock/path',
            ixosFlashV1Available: false,
            ixosFlashV1Path: null,
            ixosProV1Available: false,
            ixosProV1Path: null,
            anyAvailable: true,
            recommended: 'ixos-flash-v2',
            loadedModel: 'ixos-flash-v2',
          });
        }
      } catch (err) {
        console.warn('Failed to get model status:', err);
      }
    }
    fetchStatus();
  }, []);

  useEffect(() => {
    if (!status || !status.anyAvailable) return;
    if (value === currentLoadedModel || preloadingModel) return;

    const isAvailable = value === 'ixos-pro-v2'
      ? status.ixosProV2Available
      : status.ixosFlashV2Available;

    if (!isAvailable) return;

    setPreloadingModel(value);
    safeInvoke('preload_model', { modelType: value })
      .then(() => setCurrentLoadedModel(value))
      .catch((err) => console.warn('Failed to preload model:', err))
      .finally(() => setPreloadingModel(null));
  }, [status, value, currentLoadedModel, preloadingModel]);

  return (
    <div className={cn('relative', className)}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen((open) => !open)}
        disabled={!!preloadingModel || !!downloadingModel}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-md',
          'bg-transparent hover:bg-graphite-3/55',
          'transition-all duration-200',
          'text-[11px] uppercase tracking-[0.1em] border border-transparent hover:border-white/8',
          'min-w-[150px] max-w-[190px]',
          noModelsAvailable && 'border-amber-500/50'
        )}
      >
        {preloadingModel || downloadingModel ? (
          <Loader2 className="w-4 h-4 animate-spin text-accent-teal" />
        ) : (
          <SelectedIcon className={cn('w-4 h-4', noModelsAvailable ? 'text-accent-amber' : selectedModel.color)} />
        )}
        <span className="text-porcelain flex-1 text-left truncate">
          {preloadingModel
            ? 'Loading...'
            : downloadingModel
              ? 'Downloading...'
              : currentLoadedModel && currentLoadedModel !== value
                ? `${selectedModel.label} (warming)`
                : selectedModel.label}
        </span>
        <ChevronDown
          className={cn(
            'w-3 h-3 text-fg-dim transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      <AnimatePresence>
        {isOpen && menuMetrics && (
          <>
            <div
              className="fixed inset-0 z-[9990]"
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, y: dropdownPosition === 'bottom' ? -10 : 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: dropdownPosition === 'bottom' ? -10 : 10 }}
              transition={{ duration: 0.15 }}
              className="fixed z-[9999] rounded-xl border border-stroke-hairline bg-graphite-2 shadow-lift overflow-hidden"
              style={{
                top: menuMetrics.top,
                left: menuMetrics.left,
                width: menuMetrics.width,
                maxHeight: menuMetrics.maxHeight,
              }}
            >
              {noModelsAvailable && (
                <div className="px-3 py-2 bg-accent-amber/10 border-b border-accent-amber/20">
                  <div className="flex items-center gap-2 text-xs text-accent-amber">
                    <AlertCircle className="w-3 h-3" />
                    <span>No models installed. Download one below.</span>
                  </div>
                </div>
              )}

              <div className="max-h-[calc(100%-72px)] overflow-y-auto">
                {models.map((model) => {
                  const Icon = model.icon;
                  return (
                    <button
                      key={model.id}
                      onClick={() => void handleSelect(model.id)}
                      onMouseEnter={() => setHoveredModelId(model.id)}
                      disabled={!model.available && downloadingModel !== null}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-3',
                        'transition-colors duration-150 text-left',
                        model.id === value && 'bg-graphite-3',
                        'hover:bg-graphite-3'
                      )}
                    >
                      <Icon className={cn('w-4 h-4', !model.available ? 'text-fg-dim' : model.color)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-porcelain">
                            {model.label}
                          </span>
                          {model.recommended && model.available && (
                            <span className="text-2xs px-1.5 py-0.5 rounded bg-accent-teal/20 text-accent-teal">
                              Rec
                            </span>
                          )}
                          {!model.available && (
                            !downloadingModel ? (
                              <span
                                onClick={(event) => void handleDownload(event, model.id)}
                                className="flex items-center gap-1 text-2xs px-2 py-0.5 rounded bg-accent-teal/10 text-accent-teal hover:bg-accent-teal/20 transition-colors cursor-pointer"
                              >
                                <DownloadCloud className="w-3 h-3" />
                                Download
                              </span>
                            ) : downloadingModel === model.id && (
                              <span className="flex items-center gap-1 text-2xs px-2 py-0.5 rounded bg-graphite-3 text-fg-dim">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                ...
                              </span>
                            )
                          )}
                        </div>
                        <div className="text-2xs text-fg-dim mt-0.5 truncate">
                          {model.description}
                        </div>
                      </div>
                      {model.id === value && (
                        <Check className={cn('w-4 h-4', model.color)} />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="h-[72px] border-t border-stroke-hairline bg-graphite-1 px-3 py-2">
                <p className={cn('text-[10px] font-semibold uppercase tracking-[0.12em]', hoveredModel.color)}>
                  {hoveredModel.label}
                </p>
                <p className="mt-1 text-[10px] text-fg-secondary leading-tight">
                  {hoveredModel.details}
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
