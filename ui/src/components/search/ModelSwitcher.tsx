import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Beaker, Wand2, ChevronDown, Check, AlertCircle, Loader2 } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { cn } from '@/lib/utils';
import type { ModelType } from '@/lib/types';
export type { ModelType };

interface ModelSwitcherProps {
    value: ModelType;
    onChange: (model: ModelType) => void | Promise<void>;
    className?: string;
}

interface ModelStatus {
    potionAvailable: boolean;
    potionPath: string | null;
    qwenAvailable: boolean;
    qwenPath: string | null;
    ixosFlashV2Available: boolean;
    ixosFlashV2Path: string | null;
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
    available: boolean;
    recommended?: boolean;
    icon: React.ElementType;
    color: string;
}

export function ModelSwitcher({ value, onChange, className }: ModelSwitcherProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>('bottom');
    const [status, setStatus] = useState<ModelStatus | null>(null);
    const [preloadingModel, setPreloadingModel] = useState<ModelType | null>(null);
    const [currentLoadedModel, setCurrentLoadedModel] = useState<ModelType | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    // Safe Tauri invoke helper
    const safeInvoke = async <T,>(cmd: string, args?: any): Promise<T | null> => {
        try {
            // Check if Tauri is available on window object implicitly or import gracefully
            if (typeof window !== 'undefined' && '__TAURI__' in window) {
                return await invoke<T>(cmd, args);
            }
            // Try explicit import check
            const { invoke: tauriInvoke } = await import('@tauri-apps/api/core');
            return await tauriInvoke<T>(cmd, args);
        } catch (e) {
            console.log(`Tauri invoke '${cmd}' failed (browser mode):`, e);
            return null;
        }
    };

    // Calculate dropdown position to avoid overflow
    useEffect(() => {
        if (!isOpen || !dropdownRef.current || !buttonRef.current) return;

        const updatePosition = () => {
            const buttonRect = buttonRef.current?.getBoundingClientRect();
            const dropdownRect = dropdownRef.current?.getBoundingClientRect();
            
            if (!buttonRect || !dropdownRect) return;

            // Calculate space below and above the button
            const spaceBelow = window.innerHeight - buttonRect.bottom;
            const spaceAbove = buttonRect.top;
            const dropdownHeight = dropdownRect.height;

            // If not enough space below and more space above, position dropdown above
            if (spaceBelow < dropdownHeight + 10 && spaceAbove > dropdownHeight + 10) {
                setDropdownPosition('top');
            } else {
                setDropdownPosition('bottom');
            }
        };

        // Use setTimeout to ensure DOM is ready
        const timer = setTimeout(updatePosition, 0);
        return () => clearTimeout(timer);
    }, [isOpen]);

    const handleSelect = async (model: ModelType) => {
        const modelOption = models.find(m => m.id === model);
        if (!modelOption?.available) return;

        setIsOpen(false);

        // Await config save before preloading to ensure model type is persisted
        await onChange(model);

        // Skip preload if model is already loaded (fixes 6s delay on reselection)
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

    // Fetch model status on mount
    useEffect(() => {
        async function fetchStatus() {
            try {
                const result = await safeInvoke<ModelStatus>('get_model_status');
                if (result) {
                    setStatus(result);
                    if (result.loadedModel) {
                        setCurrentLoadedModel(result.loadedModel as ModelType);
                    }
                }
                else {
                    // Mock status for browser testing
                    setStatus({
                        potionAvailable: true,
                        potionPath: 'mock/path',
                        qwenAvailable: true,
                        qwenPath: 'mock/path',
                        ixosFlashV2Available: true,
                        ixosFlashV2Path: 'mock/path',
                        ixosProV1Available: true,
                        ixosProV1Path: 'mock/path',
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

        const isAvailable = value === 'potion'
            ? status.potionAvailable
            : value === 'qwen'
                ? status.qwenAvailable
                : value === 'ixos-pro-v1'
                    ? status.ixosProV1Available
                    : status.ixosFlashV2Available;
        if (!isAvailable) return;

        setPreloadingModel(value);
        safeInvoke('preload_model', { modelType: value })
            .then(() => setCurrentLoadedModel(value))
            .catch((err) => console.warn('Failed to preload model:', err))
            .finally(() => setPreloadingModel(null));
    }, [status, value, currentLoadedModel, preloadingModel]);

    const noModelsAvailable = status && !status.anyAvailable;

    const models: ModelOption[] = [
        {
            id: 'ixos-flash-v2',
            label: 'Ixos Flash v2',
            description: 'Fast, tuned for instant search',
            available: status?.ixosFlashV2Available ?? false,
            recommended: status?.recommended === 'ixos-flash-v2',
            icon: Beaker,
            color: 'text-accent-teal'
        },
        {
            id: 'potion',
            label: 'Potion 8M (Legacy)',
            description: 'Small and fast fallback',
            available: status?.potionAvailable ?? false,
            recommended: status?.recommended === 'potion',
            icon: Beaker,
            color: 'text-accent-amber'
        },
        {
            id: 'qwen',
            label: 'Ixos Embedder v1 (Qwen)',
            description: 'Experimental student',
            available: status?.qwenAvailable ?? false,
            recommended: status?.recommended === 'qwen',
            icon: Wand2,
            color: 'text-accent-violet'
        },
        {
            id: 'ixos-pro-v1',
            label: 'Ixos Pro v1',
            description: 'Higher quality, slower',
            available: status?.ixosProV1Available ?? false,
            recommended: status?.recommended === 'ixos-pro-v1',
            icon: Wand2,
            color: 'text-accent-magenta'
        }
    ];

    const selectedModel = models.find(m => m.id === value) || models[0];
    const SelectedIcon = selectedModel.icon;

    return (
        <div className={cn('relative', className)}>
            {/* Trigger button */}
            <button
                ref={buttonRef}
                onClick={() => setIsOpen(!isOpen)}
                disabled={!!preloadingModel}
                className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-md',
                    'bg-graphite-2 hover:bg-graphite-3',
                    'border border-stroke-hairline hover:border-border-medium',
                    'transition-all duration-200',
                    'text-xs uppercase tracking-[0.16em] min-w-[150px] max-w-[180px]',
                    noModelsAvailable && 'border-amber-500/50'
                )}
            >
                {preloadingModel ? (
                    <Loader2 className="w-4 h-4 animate-spin text-accent-teal" />
                ) : (
                    <SelectedIcon className={cn('w-4 h-4', noModelsAvailable ? 'text-accent-amber' : selectedModel.color)} />
                )}
                <span className="text-porcelain flex-1 text-left truncate">
                    {preloadingModel
                        ? 'Loading...'
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
                {isOpen && (
                    <>
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setIsOpen(false)}
                        />

                        <motion.div
                            ref={dropdownRef}
                            initial={{ opacity: 0, y: dropdownPosition === 'bottom' ? -10 : 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: dropdownPosition === 'bottom' ? -10 : 10 }}
                            transition={{ duration: 0.15 }}
                            className={cn(
                                'absolute z-50 right-0',
                                dropdownPosition === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2',
                                'w-72',
                                'bg-graphite-2 rounded-xl border border-stroke-hairline',
                                'shadow-lift overflow-hidden'
                            )}
                        >
                            {noModelsAvailable && (
                                <div className="px-3 py-2 bg-accent-amber/10 border-b border-accent-amber/20">
                                    <div className="flex items-center gap-2 text-xs text-accent-amber">
                                        <AlertCircle className="w-3 h-3" />
                            <span>No models installed. Run distill_model2vec_lab.py</span>
                                    </div>
                                </div>
                            )}

                            {models.map((model) => {
                                const Icon = model.icon;
                                return (
                                    <button
                                        key={model.id}
                                        onClick={() => handleSelect(model.id)}
                                        disabled={!model.available}
                                        className={cn(
                                            'w-full flex items-center gap-3 px-4 py-3',
                                            'transition-colors duration-150',
                                            'text-left',
                                            model.id === value && 'bg-graphite-3',
                                            !model.available
                                                ? 'opacity-40 cursor-not-allowed'
                                                : 'hover:bg-graphite-3'
                                        )}
                                    >
                                        <Icon className={cn(
                                            'w-4 h-4',
                                            !model.available
                                                ? 'text-fg-dim'
                                                : model.color
                                        )} />
                                        <div className="flex-1">
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
                                                    <span className="text-2xs px-1.5 py-0.5 rounded bg-graphite-3 text-fg-dim">
                                                        N/A
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-2xs text-fg-dim mt-0.5">
                                                {model.description}
                                            </div>
                                        </div>
                                        {model.id === value && (
                                            <Check className={cn('w-4 h-4', model.color)} />
                                        )}
                                    </button>
                                );
                            })}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}

