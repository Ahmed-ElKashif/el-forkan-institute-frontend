import type { InputHTMLAttributes, ReactNode } from 'react';
import { Icon } from '../core/Icon';
import { cn } from '../cn';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode;
  indeterminate?: boolean;
  /** Applied to the wrapping label. */
  wrapperClassName?: string;
}

/** Checkbox with a visible label. Also the row-selector in preview tables.
 *  The real input stays in the DOM (screen-reader only) so keyboard and form
 *  semantics are untouched; the box is the painted proxy. */
export function Checkbox({
  label,
  checked = false,
  indeterminate = false,
  disabled = false,
  onChange,
  className,
  wrapperClassName,
  ...rest
}: CheckboxProps) {
  const on = checked || indeterminate;
  return (
    <label
      className={cn(
        'group inline-flex items-center gap-2 text-sm',
        disabled ? 'cursor-not-allowed text-ink-400' : 'cursor-pointer text-ink-700',
        wrapperClassName,
      )}
    >
      <input
        type="checkbox"
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
          'grid size-[18px] shrink-0 place-items-center rounded-sm border text-white',
          'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus',
          on ? 'border-brand bg-brand' : 'border-strong bg-surface',
          className,
        )}
      >
        {on ? <Icon name={indeterminate ? 'minus' : 'check'} size={13} /> : null}
      </span>
      {label ? <span>{label}</span> : null}
    </label>
  );
}
