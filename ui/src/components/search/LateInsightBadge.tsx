import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface LateInsightBadgeProps {
  count: number;
  onReveal: () => void;
}

export function LateInsightBadge({ count, onReveal }: LateInsightBadgeProps) {
  if (count === 0) return null;

  return (
    <AnimatePresence>
      <motion.button
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 20 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onReveal}
        className="fixed bottom-6 right-6 flex items-center gap-2 bg-accent text-text-primary px-4 py-2.5 rounded-full shadow-lg hover:shadow-xl transition-shadow z-50"
      >
        <Sparkles className="w-4 h-4" />
        <span className="font-medium">
          {count} New Insight{count > 1 ? 's' : ''} Found
        </span>
      </motion.button>
    </AnimatePresence>
  );
}
