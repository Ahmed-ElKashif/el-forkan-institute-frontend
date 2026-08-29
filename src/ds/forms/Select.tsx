import type { SelectHTMLAttributes } from 'react';
import { Icon } from '../core/Icon';
import { cn } from '../cn';

export interface SelectOption {
  value: string | number;
  label: string;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  options?: SelectOption[];
  size?: 'sm' | 'md';
  invalid?: boolean;
  placeholder?: string;
  wrapperClassName?: string;
}

/** Native select with a Forkan skin — native because it is the only control
 *  that behaves correctly on a classroom phone. */
export function Select({
  options = [],
  size = 'md',
  invalid = false,
  disabled = false,
  placeholder,
  className,
  wrapperClassName,
  ...rest
}: SelectProps) {
  return (
    <div className={cn('relative', wrapperClassName)}>
      <select
        disabled={disabled}
        aria-invalid={invalid || undefined}
        className={cn(
          'w-full appearance-none rounded-md border ps-3 pe-8 text-sm text-ink-900',
          size === 'sm' ? 'h-8' : 'h-10',
          disabled ? 'cursor-not-allowed bg-canvas' : 'bg-surface',
          invalid ? 'border-danger' : 'border-default',
          className,
        )}
        {...rest}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <Icon
        name="chevron-down"
        size={16}
        className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-ink-500"
      />
    </div>
  );
}
