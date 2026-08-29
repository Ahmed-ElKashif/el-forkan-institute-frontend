import type { HTMLAttributes } from 'react';
import { cn } from '../cn';

export interface TabItem {
  key: string;
  label: string;
  count?: number;
}

export interface TabsProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  items?: TabItem[];
  active?: string;
  onSelect?: (key: string) => void;
}

/** Underlined tab set for detail pages. */
export function Tabs({ items = [], active, onSelect, className, ...rest }: TabsProps) {
  return (
    <div role="tablist" className={cn('flex gap-6 border-b border-subtle', className)} {...rest}>
      {items.map((i) => {
        const on = active === i.key;
        return (
          <button
            key={i.key}
            role="tab"
            type="button"
            aria-selected={on}
            onClick={() => onSelect?.(i.key)}
            className={cn(
              '-mb-px inline-flex cursor-pointer items-center gap-1.5 border-none border-b-2 bg-transparent py-3 text-sm',
              on
                ? 'border-brand font-semibold text-brand-text'
                : 'border-transparent font-normal text-ink-500 hover:text-ink-700',
            )}
          >
            {i.label}
            {i.count != null ? (
              <span className="ef-num rounded-full bg-line-200 px-1.5 text-xs text-ink-500">{i.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
