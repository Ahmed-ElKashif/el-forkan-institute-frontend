import type { HTMLAttributes, ReactNode } from 'react';
import { Icon } from '../core/Icon';
import { cn } from '../cn';

export interface FieldProps extends HTMLAttributes<HTMLDivElement> {
  label?: ReactNode;
  htmlFor?: string;
  required?: boolean;
  hint?: ReactNode;
  error?: ReactNode;
  /** Marks a control only the head teacher may use. */
  headTeacherOnly?: boolean;
  children?: ReactNode;
}

/** Label + control + hint/error wrapper. Errors carry an icon, never colour
 *  alone, and state the rule rather than the failure. */
export function Field({
  label,
  htmlFor,
  required = false,
  hint,
  error,
  headTeacherOnly = false,
  className,
  children,
  ...rest
}: FieldProps) {
  return (
    <div className={cn('grid gap-2', className)} {...rest}>
      {label ? (
        <label
          htmlFor={htmlFor}
          className="flex items-center gap-2 text-sm font-semibold leading-[1.4] text-ink-900"
        >
          <span>
            {label}
            {required ? <span className="ms-0.5 text-danger">*</span> : null}
          </span>
          {headTeacherOnly ? (
            <span className="rounded-full border border-gold-200 bg-gold-50 px-1.5 text-xs font-normal text-gold-700">
              مدير فقط
            </span>
          ) : null}
        </label>
      ) : null}

      {children}

      {error ? (
        <p className="m-0 flex items-start gap-1 text-xs leading-[1.6] text-danger">
          <Icon name="circle-alert" size={14} className="mt-0.5" />
          {error}
        </p>
      ) : hint ? (
        <p className="m-0 text-xs leading-[1.6] text-ink-500">{hint}</p>
      ) : null}
    </div>
  );
}
