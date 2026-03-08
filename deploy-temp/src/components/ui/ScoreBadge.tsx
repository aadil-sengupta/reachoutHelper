interface ScoreBadgeProps {
  score: number | undefined | null;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

/**
 * Displays an ML score as a colored badge.
 * - Green: >= 70% (high match)
 * - Yellow: 40-69% (medium match)
 * - Red: < 40% (low match)
 * - Gray: no score available
 */
export function ScoreBadge({ score, size = 'md', showLabel = false }: ScoreBadgeProps) {
  if (score === undefined || score === null) {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 text-slate-500 ${
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' :
        size === 'lg' ? 'px-3 py-1.5 text-sm' :
        'px-2 py-0.5 text-xs'
      }`}>
        <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
        --
      </span>
    );
  }
  
  const percentage = Math.round(score * 100);
  
  // Determine color based on score
  const getColors = () => {
    if (score >= 0.7) {
      return {
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        text: 'text-emerald-700',
        dot: 'bg-emerald-500',
      };
    } else if (score >= 0.4) {
      return {
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        text: 'text-amber-700',
        dot: 'bg-amber-500',
      };
    } else {
      return {
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-700',
        dot: 'bg-red-500',
      };
    }
  };
  
  const colors = getColors();
  
  const sizeClasses = 
    size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' :
    size === 'lg' ? 'px-3 py-1.5 text-sm' :
    'px-2 py-0.5 text-xs';
  
  return (
    <span 
      className={`inline-flex items-center gap-1 rounded-full border font-medium ${colors.bg} ${colors.border} ${colors.text} ${sizeClasses}`}
      title={`ML Score: ${percentage}%`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
      {percentage}%
      {showLabel && <span className="opacity-75 ml-0.5">match</span>}
    </span>
  );
}

/**
 * Displays a compact score bar visualization
 */
export function ScoreBar({ score }: { score: number | undefined | null }) {
  if (score === undefined || score === null) {
    return (
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full w-0 bg-slate-300" />
      </div>
    );
  }
  
  const percentage = Math.round(score * 100);
  
  const barColor = 
    score >= 0.7 ? 'bg-emerald-500' :
    score >= 0.4 ? 'bg-amber-500' :
    'bg-red-500';
  
  return (
    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden" title={`${percentage}%`}>
      <div 
        className={`h-full ${barColor} transition-all duration-300`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
