import type { InputHTMLAttributes } from 'react';
import { Icon } from '../core/Icon';
import { cn } from '../cn';

export interface ScoreInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'max'> {
  value?: string | number | null;
  /** The subject's maximum from the curriculum row. */
  max?: number;
  absent?: boolean;
  /** After `POST /exams/:id/lock`. A distinct state from `disabled`. */
  locked?: boolean;
  wrapperClassName?: string;
}

/** Inline numeric cell for the score grid. Validates against the subject max
 *  while typing; `locked` renders the read-only skin used after exam lock. */
export function ScoreInput({
  value,
  max = 100,
  absent = false,
  locked = false,
  onChange,
  className,
  wrapperClassName,
  ...rest
}: ScoreInputProps) {
  const over = value !== '' && value != null && Number(value) > max;

  if (absent) {
    return (
      <span
        className={cn(
          'ef-state inline-flex h-8 w-[68px] items-center justify-center gap-1 rounded-sm',
          'bg-att-absent-bg text-sm font-semibold text-att-absent-fg',
          wrapperClassName,
        )}
      >
        <span aria-hidden="true">✕</span>
        غائب
      </span>
    );
  }

  return (
    <span className={cn('relative inline-block', wrapperClassName)}>
      <input
        inputMode="decimal"
        value={value ?? ''}
        readOnly={locked || !onChange}
        onChange={onChange}
        aria-invalid={over || undefined}
        className={cn(
          'ef-num h-8 w-[68px] rounded-sm border text-center text-sm',
          locked ? 'bg-canvas pe-4' : 'bg-surface',
          over ? 'border-danger text-danger' : 'border-default text-ink-900',
          className,
        )}
        {...rest}
      />
      {locked ? (
        <Icon
          name="lock"
          size={12}
          className="pointer-events-none absolute end-1 top-1/2 -translate-y-1/2 text-ink-400"
        />
      ) : null}
    </span>
  );
}
