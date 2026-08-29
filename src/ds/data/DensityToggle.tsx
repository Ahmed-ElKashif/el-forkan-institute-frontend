import type { HTMLAttributes } from 'react';
import { Icon, type IconName } from '../core/Icon';
import type { Density } from './DataTable';
import { cn } from '../cn';

const OPTIONS: { key: Density; label: string; icon: IconName }[] = [
  { key: 'comfortable', label: 'مريح', icon: 'rows-3' },
  { key: 'compact', label: 'مضغوط', icon: 'rows-4' },
];

export interface DensityToggleProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  value?: Density;
  onChange?: (value: Density) => void;
}

/** Switches a grid between comfortable (48px) and compact (32px) rows.
 *  Both densities matter equally — the same table serves a phone and a desk. */
export function DensityToggle({
  value = 'comfortable',
  onChange,
  className,
  ...rest
}: DensityToggleProps) {
  return (
    <div
      role="group"
      aria-label="كثافة الجدول"
      className={cn('inline-flex gap-0.5 rounded-md border border-default bg-canvas p-0.5', className)}
      {...rest}
    >
      {OPTIONS.map((o) => {
        const on = value === o.key;
        return (
          <button
            key={o.key}
            type="button"
            aria-pressed={on}
            onClick={() => onChange?.(o.key)}
            className={cn(
              'inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-sm border-none px-3 text-xs font-semibold',
              'transition-colors duration-[var(--dur-fast)] ease-standard',
              on ? 'bg-brand text-on-brand' : 'bg-transparent text-ink-500 hover:bg-line-200',
            )}
          >
            <Icon name={o.icon} size={14} />
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
