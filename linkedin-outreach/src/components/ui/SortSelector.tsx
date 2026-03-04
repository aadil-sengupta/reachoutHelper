import type { SortOption } from '@/types';

interface SortSelectorProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
  className?: string;
  hasScores?: boolean; // Whether ML scores are available
}

const SORT_OPTIONS: { value: SortOption; label: string; requiresScores?: boolean }[] = [
  { value: 'score_desc', label: 'ML Score (High to Low)', requiresScores: true },
  { value: 'score_asc', label: 'ML Score (Low to High)', requiresScores: true },
  { value: 'date_asc', label: 'Date Added (Oldest First)' },
  { value: 'date_desc', label: 'Date Added (Newest First)' },
  { value: 'location_asc', label: 'Location (A to Z)' },
  { value: 'location_desc', label: 'Location (Z to A)' },
];

export function SortSelector({ value, onChange, className = '', hasScores = true }: SortSelectorProps) {
  // Filter options based on whether scores are available
  const availableOptions = hasScores 
    ? SORT_OPTIONS 
    : SORT_OPTIONS.filter(opt => !opt.requiresScores);
  
  return (
    <div className={`relative inline-flex items-center gap-2 ${className}`}>
      <label className="text-sm text-[hsl(var(--muted-foreground))]">Sort by:</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as SortOption)}
          className="h-9 pl-3 pr-8 text-sm rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] appearance-none cursor-pointer hover:bg-[hsl(var(--accent))] transition-colors"
        >
          {availableOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <svg 
          className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))] pointer-events-none" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}
