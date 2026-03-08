import type { OutreachStatus } from '@/types';

const statusConfig: Record<OutreachStatus, { bg: string; text: string; label: string; dot: string }> = {
  pending: { 
    bg: 'bg-amber-50 border-amber-200', 
    text: 'text-amber-700', 
    dot: 'bg-amber-500',
    label: 'Pending' 
  },
  reached_out: { 
    bg: 'bg-blue-50 border-blue-200', 
    text: 'text-blue-700', 
    dot: 'bg-blue-500',
    label: 'Reached Out' 
  },
  replied: { 
    bg: 'bg-emerald-50 border-emerald-200', 
    text: 'text-emerald-700', 
    dot: 'bg-emerald-500',
    label: 'Replied' 
  },
  ignored: { 
    bg: 'bg-slate-50 border-slate-200', 
    text: 'text-slate-600', 
    dot: 'bg-slate-400',
    label: 'Ignored' 
  },
};

export function StatusBadge({ status }: { status: OutreachStatus }) {
  const config = statusConfig[status] || statusConfig.pending;
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.bg} ${config.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
