import type { TextareaHTMLAttributes } from 'react';
import { cn } from '../cn';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

/** Multi-line input — correction reasons, revocation causes, notes. */
export function Textarea({
  rows = 4,
  invalid = false,
  disabled = false,
  readOnly = false,
  className,
  ...rest
}: TextareaProps) {
  return (
    <textarea
      rows={rows}
      disabled={disabled}
      readOnly={readOnly}
      aria-invalid={invalid || undefined}
      className={cn(
        'w-full resize-y rounded-md border p-3 text-base leading-body text-ink-900',
        readOnly || disabled ? 'bg-canvas' : 'bg-surface',
        invalid ? 'border-danger' : 'border-default',
        disabled && 'cursor-not-allowed',
        className,
      )}
      {...rest}
    />
  );
}
