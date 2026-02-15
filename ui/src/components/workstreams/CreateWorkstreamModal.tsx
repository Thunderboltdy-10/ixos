/**
 * CreateWorkstreamModal - Modal dialog for creating a new workstream
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Layers, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreateWorkstreamModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (name: string, description?: string, selectedFilePaths?: string[]) => Promise<void>;
    recentFiles?: Array<{
        path: string;
        name: string;
        lastTouchedLabel?: string;
    }>;
}

export function CreateWorkstreamModal({ isOpen, onClose, onSubmit, recentFiles = [] }: CreateWorkstreamModalProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [selectedFilePaths, setSelectedFilePaths] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            setError('Please enter a workstream name');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            await onSubmit(name.trim(), description.trim() || undefined, selectedFilePaths);
            // Reset form and close
            setName('');
            setDescription('');
            setSelectedFilePaths([]);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create workstream');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!isSubmitting) {
            setName('');
            setDescription('');
            setSelectedFilePaths([]);
            setError(null);
            onClose();
        }
    };

    const togglePath = (path: string) => {
        setSelectedFilePaths((prev) =>
            prev.includes(path) ? prev.filter((value) => value !== path) : [...prev, path]
        );
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                        className="fixed inset-0 bg-graphite-0/80 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className={cn(
                                'w-full max-w-lg p-6 rounded-xl max-h-[88vh] overflow-auto',
                                'bg-graphite-1 border border-stroke-hairline',
                                'shadow-2xl'
                            )}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-accent-teal/10">
                                        <Layers className="w-5 h-5 text-accent-teal" />
                                    </div>
                                    <h2 className="text-lg font-semibold text-porcelain">
                                        New Workstream
                                    </h2>
                                </div>
                                <button
                                    onClick={handleClose}
                                    disabled={isSubmitting}
                                    className={cn(
                                        'p-2 rounded-md text-fg-dim',
                                        'hover:bg-graphite-2 hover:text-fg-muted transition-colors',
                                        'disabled:opacity-50 disabled:cursor-not-allowed'
                                    )}
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* Name input */}
                                <div>
                                    <label
                                        htmlFor="workstream-name"
                                        className="block text-sm font-medium text-fg-muted mb-1.5"
                                    >
                                        Name <span className="text-error">*</span>
                                    </label>
                                    <input
                                        id="workstream-name"
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g., Feature Development, Bug Fixes"
                                        disabled={isSubmitting}
                                        autoFocus
                                        className={cn(
                                            'w-full px-3 py-2.5 rounded-lg',
                                            'bg-graphite-2 border border-stroke-hairline',
                                            'text-porcelain placeholder:text-fg-ghost',
                                            'focus:outline-none focus:border-accent-teal focus:ring-1 focus:ring-accent-teal/30',
                                            'disabled:opacity-50 disabled:cursor-not-allowed',
                                            'transition-colors'
                                        )}
                                    />
                                </div>

                                {/* Description input */}
                                <div>
                                    <label
                                        htmlFor="workstream-description"
                                        className="block text-sm font-medium text-fg-muted mb-1.5"
                                    >
                                        Description <span className="text-fg-ghost">(optional)</span>
                                    </label>
                                    <textarea
                                        id="workstream-description"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="What is this workstream about?"
                                        disabled={isSubmitting}
                                        rows={3}
                                        className={cn(
                                            'w-full px-3 py-2.5 rounded-lg resize-none',
                                            'bg-graphite-2 border border-stroke-hairline',
                                            'text-porcelain placeholder:text-fg-ghost',
                                            'focus:outline-none focus:border-accent-teal focus:ring-1 focus:ring-accent-teal/30',
                                            'disabled:opacity-50 disabled:cursor-not-allowed',
                                            'transition-colors'
                                        )}
                                    />
                                </div>

                                <div className="rounded-lg border border-white/8 bg-graphite-2/45 p-3">
                                    <p className="text-xs font-semibold text-fg-secondary mb-1">Seed With Recent Files</p>
                                    <p className="text-2xs text-fg-dim mb-3">
                                        Select files to include now. Ixos links their recent activity into this workstream.
                                    </p>
                                    {recentFiles.length === 0 ? (
                                        <p className="text-2xs text-fg-ghost">Open a few files first and they will appear here.</p>
                                    ) : (
                                        <div className="space-y-1.5 max-h-44 overflow-auto">
                                            {recentFiles.slice(0, 10).map((file) => (
                                                <label
                                                    key={file.path}
                                                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-graphite-3/45 transition-colors cursor-pointer"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedFilePaths.includes(file.path)}
                                                        onChange={() => togglePath(file.path)}
                                                        className="rounded border-stroke-hairline bg-graphite-1 text-accent-teal focus:ring-accent-teal/40"
                                                    />
                                                    <span className="text-xs text-fg-secondary truncate flex-1">{file.name}</span>
                                                    {file.lastTouchedLabel && (
                                                        <span className="text-2xs text-fg-ghost shrink-0">{file.lastTouchedLabel}</span>
                                                    )}
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Error message */}
                                {error && (
                                    <motion.p
                                        initial={{ opacity: 0, y: -5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="text-sm text-error"
                                    >
                                        {error}
                                    </motion.p>
                                )}

                                {/* Actions */}
                                <div className="flex items-center justify-end gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={handleClose}
                                        disabled={isSubmitting}
                                        className={cn(
                                            'px-4 py-2 rounded-lg font-medium text-sm',
                                            'text-fg-muted hover:text-porcelain',
                                            'hover:bg-graphite-2 transition-colors',
                                            'disabled:opacity-50 disabled:cursor-not-allowed'
                                        )}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting || !name.trim()}
                                        className={cn(
                                            'flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm',
                                            'bg-accent-teal text-graphite-0',
                                            'hover:bg-accent-teal/90 transition-colors',
                                            'disabled:opacity-50 disabled:cursor-not-allowed'
                                        )}
                                    >
                                        <Plus className="w-4 h-4" />
                                        {isSubmitting ? 'Creating...' : 'Create Workstream'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}
