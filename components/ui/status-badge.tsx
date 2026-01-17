import type { ApiStatus } from '@/types';
import { cn } from '@/lib/utils/cn';

interface StatusBadgeProps {
  status: ApiStatus;
  className?: string;
}

const statusConfig: Record<
  ApiStatus,
  { label: string; className: string }
> = {
  up: {
    label: 'UP',
    className: 'bg-green-100 text-green-800 border-green-200',
  },
  down: {
    label: 'DOWN',
    className: 'bg-red-100 text-red-800 border-red-200',
  },
  checking: {
    label: 'CHECKING',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  unknown: {
    label: 'UNKNOWN',
    className: 'bg-slate-100 text-slate-800 border-slate-200',
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        config.className,
        className
      )}
    >
      <span
        className={cn(
          'w-2 h-2 rounded-full mr-1.5',
          status === 'up' && 'bg-green-500',
          status === 'down' && 'bg-red-500',
          status === 'checking' && 'bg-yellow-500 animate-pulse',
          status === 'unknown' && 'bg-slate-500'
        )}
      />
      {config.label}
    </span>
  );
}
