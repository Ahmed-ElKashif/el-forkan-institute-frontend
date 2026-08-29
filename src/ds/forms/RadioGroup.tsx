import type { HTMLAttributes } from 'react';
import { cn } from '../cn';

export interface RadioOption {
  value: string;
  label: string;
  hint?: string;
}

export interface RadioGroupProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  name: string;
  options?: RadioOption[];
  value?: string;
  onChange?: (value: string) => void;
  inline?: boolean;
  disabled?: boolean;
}

/** Vertical or inline radio set. */
export function RadioGroup({
  name,
  options = [],
  value,
  onChange,
  inline = false,
  disabled = false,
  className,
  ...rest
}: RadioGroupProps) {
  return (
    <div
      role="radiogroup"
      className={cn('flex', inline ? 'flex-row gap-6' : 'flex-col gap-3', className)}
      {...rest}
    >
      {options.map((o) => {
        const on = value === o.value;
        return (
          <label
            key={o.value}
            className={cn(
              'flex items-start gap-2 text-sm text-ink-700',
              disabled ? 'cursor-not-allowed' : 'cursor-pointer',
            )}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={on}
              disabled={disabled}
              onChange={() => onChange?.(o.value)}
              className="ef-sr peer"
            />
            <span
              aria-hidden="true"
              className={cn(
                'mt-0.5 size-[18px] shrink-0 rounded-full bg-surface',
                'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus',
                on ? 'border-[5px] border-brand' : 'border border-strong',
              )}
            />
            <span>
              <span className={cn(on ? 'font-semibold text-ink-900' : 'font-normal')}>{o.label}</span>
              {o.hint ? <span className="block text-xs text-ink-500">{o.hint}</span> : null}
            </span>
          </label>
        );
      })}
    </div>
  );
}
