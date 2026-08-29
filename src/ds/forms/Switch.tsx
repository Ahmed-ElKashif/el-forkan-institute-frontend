import type { InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '../cn';

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode;
  wrapperClassName?: string;
}

/** On/off for settings and policies.
 *  RTL-aware: the knob travels along the inline axis, so it moves toward the
 *  inline-end in Arabic exactly as it moves right in English. */
export function Switch({
  label,
  checked = false,
  disabled = false,
  onChange,
  className,
  wrapperClassName,
  ...rest
}: SwitchProps) {
  return (
    <label
      className={cn(
        'inline-flex items-center gap-3 text-sm',
        disabled ? 'cursor-not-allowed text-ink-400' : 'cursor-pointer text-ink-700',
        wrapperClassName,
      )}
    >
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        readOnly={onChange ? undefined : true}
        className="ef-sr peer"
        {...rest}
      />
      <span
        aria-hidden="true"
        className={cn(
          'relative h-[22px] w-10 shrink-0 rounded-full',
          'transition-colors duration-[var(--dur-base)] ease-standard',
          'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus',
          checked ? 'bg-brand' : 'bg-line-300',
          className,
        )}
      >
        <span
          className={cn(
            'absolute top-[3px] size-4 rounded-full bg-white shadow-card',
            'transition-[inset-inline-start] duration-[var(--dur-base)] ease-standard',
            checked ? 'start-[21px]' : 'start-[3px]',
          )}
        />
      </span>
      {label ? <span>{label}</span> : null}
    </label>
  );
}
