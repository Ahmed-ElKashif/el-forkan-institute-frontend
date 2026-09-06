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
  /** Makes the tile a control — cursor, hover lift, focus ring, and keyboard
   *  (Enter/Space) — for a drill-down or a filter toggle. Static tiles stay
   *  flat, so the hover cue only appears where a click actually does something. */
  interactive?: boolean;
  /** Selected state for an interactive tile used as a filter (aria-pressed). */
  active?: boolean;
}

/** Dashboard summary tile. The value renders in tabular Latin digits. Optionally
 *  a control (see `interactive`) — a clickable stat that drills in or filters. */
export function StatCard({
  label,
  value,
  unit,
  icon,
  trend,
  trendTone = 'neutral',
  interactive = false,
  active = false,
  className,
  onKeyDown,
  ...rest
}: StatCardProps) {
  return (
    <div
      {...(interactive ? { role: 'button', tabIndex: 0, 'aria-pressed': active } : {})}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.currentTarget.click();
              }
              onKeyDown?.(e);
            }
          : onKeyDown
      }
      className={cn(
        'rounded-xl border bg-surface p-5 shadow-card',
        active ? 'border-brand bg-tint' : 'border-default',
        interactive &&
          'cursor-pointer transition-[box-shadow,border-color] duration-[var(--dur-base)] hover:shadow-raised hover:border-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
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
