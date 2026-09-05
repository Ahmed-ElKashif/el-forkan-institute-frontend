import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../cn';

/** The four states `attendance_t` can hold.
 *
 *  Each carries a fill, a Unicode glyph and an Arabic label. Colour is never
 *  the only signal: these sheets are printed in black and white, and the print
 *  stylesheet strips every fill via `.ef-state`, leaving the glyph to carry the
 *  meaning. The glyphs are Unicode rather than icons because they must stay
 *  legible at a 32px row height, where a 2px stroked icon would not. */
export const ATTENDANCE_STATES = {
  present: { label: 'حاضر', glyph: '✓', className: 'bg-att-present-bg text-att-present-fg' },
  absent: { label: 'غائب', glyph: '✕', className: 'bg-att-absent-bg text-att-absent-fg' },
  excused: { label: 'بعذر', glyph: '○', className: 'bg-att-excused-bg text-att-excused-fg' },
  late: { label: 'متأخر', glyph: '◔', className: 'bg-att-late-bg text-att-late-fg' },
} as const;

export type AttendanceStatus = keyof typeof ATTENDANCE_STATES;

export interface AttendanceCellProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  status?: AttendanceStatus | null;
  showLabel?: boolean;
}

/** One cell of the attendance grid. Unrecorded renders as a dashed placeholder,
 *  which is a different thing from "absent" and must never look the same. */
export function AttendanceCell({
  status,
  showLabel = false,
  disabled = false,
  className,
  ...rest
}: AttendanceCellProps) {
  const state = status ? ATTENDANCE_STATES[status] : undefined;

  if (!state) {
    return (
      <button
        type="button"
        disabled={disabled}
        aria-label="غير مسجَّل"
        title="غير مسجَّل"
        className={cn(
          'h-8 w-full rounded-sm border border-dashed border-default bg-surface text-sm text-ink-400',
          disabled ? 'cursor-default' : 'cursor-pointer',
          className,
        )}
        {...rest}
      >
        —
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={state.label}
      title={state.label}
      className={cn(
        'ef-state inline-flex h-8 w-full items-center justify-center gap-1',
        'rounded-sm border border-transparent text-sm font-semibold',
        disabled ? 'cursor-default' : 'cursor-pointer',
        state.className,
        className,
      )}
      {...rest}
    >
      <span aria-hidden="true" className="text-[0.95em]">
        {state.glyph}
      </span>
      {showLabel ? <span>{state.label}</span> : null}
    </button>
  );
}
