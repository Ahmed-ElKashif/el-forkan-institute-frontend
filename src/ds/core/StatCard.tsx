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
      className={cn(
        'rounded-xl border border-default bg-surface p-5 shadow-card',
        'transition-shadow duration-[var(--dur-base)] hover:shadow-raised',
        className,
      )}
      {...rest}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm text-ink-500">{label}</div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="ef-num text-3xl font-bold leading-tight text-ink-900">{value}</span>
            {unit ? <span className="text-base font-semibold text-ink-500">{unit}</span> : null}
          </div>
        </div>
        {icon ? (
          <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-tint text-teal-700">
            <Icon name={icon} size={22} />
          </span>
        ) : null}
      </div>
      {trend ? <div className={cn('ef-num mt-3 text-xs', TREND_TONE[trendTone])}>{trend}</div> : null}
    </div>
  );
}
