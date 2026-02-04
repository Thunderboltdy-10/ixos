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
    onSubmit: (name: string, description?: string) => Promise<void>;
}

export function CreateWorkstreamModal({ isOpen, onClose, onSubmit }: CreateWorkstreamModalProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
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
            await onSubmit(name.trim(), description.trim() || undefined);
            // Reset form and close
            setName('');
            setDescription('');
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
            setError(null);
            onClose();
        }
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
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className={cn(
                            'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50',
                            'w-full max-w-md p-6 rounded-xl',
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
                </>
            )}
        </AnimatePresence>
    );
}
