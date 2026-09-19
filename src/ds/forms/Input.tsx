import type { ChangeEvent, InputHTMLAttributes, ReactNode } from 'react';
import { Icon, type IconName } from '../core/Icon';
import { cn } from '../cn';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: 'sm' | 'md';
  invalid?: boolean;
  /** Tabular Latin digits, centred — scores, counts, serials. Styling only. */
  numeric?: boolean;
  /** Integer digit strings only: strips any non-digit as it is typed or pasted
   *  (national ID, Hijri year). The server stays the authority — this is UX, so a
   *  letter never reaches a field that only holds a number. Decimal fields use
   *  `type="number"` instead, which the browser guards. */
  digits?: boolean;
  icon?: IconName;
  suffix?: ReactNode;
  /** Applied to the relative wrapper when `icon` or `suffix` is present. */
  wrapperClassName?: string;
}

/** Single-line text or numeric input.
 *  `readOnly` is the locked skin (canvas fill) and is a distinct state from
 *  `disabled` — it appears everywhere after an exam is locked. */
export function Input({
  size = 'md',
  invalid = false,
  numeric = false,
  digits = false,
  readOnly = false,
  disabled = false,
  icon,
  suffix,
  className,
  wrapperClassName,
  onChange,
  ...rest
}: InputProps) {
  // Strip non-digits before the value reaches the caller's onChange, so a
  // digits-only field can never hold letters (typed or pasted). The input is
  // controlled, so mutating the event's value here and re-rendering agree.
  const handleChange =
    digits && onChange
      ? (event: ChangeEvent<HTMLInputElement>) => {
          const cleaned = event.target.value.replace(/\D/g, '');
          if (cleaned !== event.target.value) event.target.value = cleaned;
          onChange(event);
        }
      : onChange;

  const control = (
    <input
      readOnly={readOnly}
      disabled={disabled}
      onChange={handleChange}
      aria-invalid={invalid || undefined}
      className={cn(
        'w-full rounded-md border px-3 text-base text-ink-900',
        size === 'sm' ? 'h-8' : 'h-10',
        readOnly || disabled ? 'bg-canvas' : 'bg-surface',
        invalid ? 'border-danger' : 'border-default',
        numeric ? 'ef-num text-center' : 'text-start',
        icon && 'ps-8',
        suffix && 'pe-8',
        disabled && 'cursor-not-allowed',
        className,
      )}
      {...rest}
    />
  );

  if (!icon && !suffix) return control;

  return (
    <div className={cn('relative block', wrapperClassName)}>
      {icon ? (
        <Icon
          name={icon}
          size={16}
          className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-400"
        />
      ) : null}
      {control}
      {suffix ? (
        <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-xs text-ink-500">
          {suffix}
        </span>
      ) : null}
    </div>
  );
}
