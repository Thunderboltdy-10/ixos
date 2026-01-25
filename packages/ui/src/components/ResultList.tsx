import { cn } from '../utils/cn';
import { ResultCard, type ResultData } from './ResultCard';

export interface ResultListProps {
  results: ResultData[];
  selectedIndex?: number;
  expandedIndex?: number;
  onSelect?: (index: number) => void;
  onOpen?: (index: number) => void;
  onReveal?: (index: number) => void;
  isDemo?: boolean;
  className?: string;
}

/**
 * Container for result cards with keyboard navigation support
 */
export function ResultList({
  results,
  selectedIndex = -1,
  expandedIndex = -1,
  onSelect,
  onOpen,
  onReveal,
  isDemo = false,
  className,
}: ResultListProps) {
  if (results.length === 0) {
    return (
      <div className={cn('py-12 text-center', className)}>
        <p className="text-fg-dim text-sm">No results found</p>
      </div>
    );
  }

  return (
    <div className={cn('divide-y divide-stroke-hairline', className)}>
      {results.map((result, index) => (
        <ResultCard
          key={`${result.directory}/${result.filename}`}
          result={result}
          index={index}
          isSelected={selectedIndex === index}
          isExpanded={expandedIndex === index}
          onClick={() => onSelect?.(index)}
          onOpen={() => onOpen?.(index)}
          onReveal={() => onReveal?.(index)}
          isDemo={isDemo}
        />
      ))}
    </div>
  );
}
