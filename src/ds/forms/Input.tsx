import type { InputHTMLAttributes, ReactNode } from 'react';
import { Icon, type IconName } from '../core/Icon';
import { cn } from '../cn';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: 'sm' | 'md';
  invalid?: boolean;
  /** Tabular Latin digits, centred — scores, counts, serials. */
  numeric?: boolean;
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
  readOnly = false,
  disabled = false,
  icon,
  suffix,
  className,
  wrapperClassName,
  ...rest
}: InputProps) {
  const control = (
    <input
      readOnly={readOnly}
      disabled={disabled}
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
