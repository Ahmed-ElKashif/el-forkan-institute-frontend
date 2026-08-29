import type { HTMLAttributes, ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import { cn } from '../cn';

const TREND_TONE = {
  up: 'text-success',
  down: 'text-danger',
  neutral: 'text-ink-500',
} as const;

export interface StatCardProps extends HTMLAttributes<HTMLDivElement> {
  label: ReactNode;
  value: ReactNode;
  unit?: ReactNode;
  icon?: IconName;
  trend?: ReactNode;
  trendTone?: keyof typeof TREND_TONE;
}

/** Dashboard summary tile. The value renders in tabular Latin digits. */
export function StatCard({
  label,
  value,
  unit,
  icon,
  trend,
  trendTone = 'neutral',
  className,
  ...rest
}: StatCardProps) {
  return (
    <div
      className={cn('rounded-lg border border-subtle bg-surface px-6 py-4 shadow-card', className)}
      {...rest}
    >
      <div className="flex items-center gap-2 text-sm text-ink-500">
        {icon ? <Icon name={icon} size={16} /> : null}
        <span>{label}</span>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="ef-num text-3xl font-bold leading-tight text-ink-900">{value}</span>
        {unit ? <span className="text-sm text-ink-500">{unit}</span> : null}
      </div>
      {trend ? <div className={cn('ef-num mt-1 text-xs', TREND_TONE[trendTone])}>{trend}</div> : null}
    </div>
  );
}
