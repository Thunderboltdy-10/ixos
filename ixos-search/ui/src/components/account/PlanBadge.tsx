import { Badge } from '@/components/ui/badge';
import { PlanTier } from '@/stores/authStore';
import { cn } from '@/lib/utils';

export function PlanBadge({ plan }: { plan: PlanTier }) {
  const isPro = plan === 'pro';
  return (
    <Badge
      variant={isPro ? 'journalist' : 'outline'}
      className={cn(isPro ? 'text-accent-magenta' : 'text-fg-muted', 'uppercase tracking-[0.2em] text-2xs')}
    >
      {isPro ? 'Pro' : 'Free'}
    </Badge>
  );
}

