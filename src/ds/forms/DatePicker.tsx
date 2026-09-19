import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DayPicker } from '@daypicker/hijri';
import { Icon } from '../core/Icon';
import { formatHijriDate } from '../format';
import { cn } from '../cn';

/* ---------------------------------------------------------------------------
   Hijri date picker.

   The institute runs on the Hijri calendar, so every date it schedules is
   chosen in Hijri — the native `<input type="date">` can only offer Gregorian,
   in the *browser's* locale rather than the app's.

   What crosses the wire does not change: the value in and out is a Gregorian
   `YYYY-MM-DD` string, which is what `DateOnlySchema` validates and what a
   Postgres DATE column stores. Spec §7.5: "Gregorian is stored truth, Hijri is
   display." Hijri is how the head teacher reads and picks it; it is never the
   thing stored.

   `@daypicker/hijri` already defaults to `locale: ar-SA`, `dir: rtl` and
   `numerals: arab`, which is exactly this product's convention — the same
   Arabic-Indic digits `formatHijriDate` puts in the page header.
--------------------------------------------------------------------------- */

/** `Date` → `YYYY-MM-DD`, read in LOCAL parts.
 *
 *  `toISOString()` would convert to UTC first, which in any timezone west of
 *  UTC reports the previous day — the same class of off-by-one the backend's
 *  hijri module exists to avoid. The picker hands back a local-midnight Date,
 *  so the local parts are the day the head teacher actually clicked. */
function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** `YYYY-MM-DD` → local-midnight `Date`, or undefined when unset/malformed.
 *  Built from parts rather than `new Date(iso)`, which parses a bare date as
 *  UTC and lands on the wrong day west of Greenwich. */
function fromIsoDate(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/* The library ships a stylesheet, but importing it would bring raw colours into
   a system where `scripts/check-tokens.mjs` exists to keep every colour in
   tokens.css. So the calendar is dressed entirely in DS utilities instead, and
   the default class names are not merged in — without their CSS they would be
   inert markers.

   The month caption and the nav share one row: the caption centred, the two
   arrows pinned to the ends. `nav` sits above the caption in the stacking order
   so the arrows stay clickable where the two overlap. */
const CALENDAR_CLASSES = {
  root: 'text-sm text-ink-900',
  months: 'relative',
  month_caption: 'flex h-9 items-center justify-center px-9 text-sm font-semibold text-ink-900',
  caption_label: 'whitespace-nowrap',
  nav: 'absolute inset-x-0 top-0 z-10 flex h-9 items-center justify-between',
  button_previous:
    'flex size-8 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-ink-600 hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-40',
  button_next:
    'flex size-8 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-ink-600 hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-40',
  chevron: 'size-4 fill-current',
  month_grid: 'w-full border-collapse',
  weekday: 'size-9 pb-1 text-xs font-normal text-ink-500',
  day: 'p-0 text-center',
  day_button:
    'size-9 cursor-pointer rounded-md border-none bg-transparent text-sm text-ink-900 hover:bg-canvas disabled:cursor-not-allowed disabled:text-ink-300',
  today: 'font-semibold text-teal-700',
  selected: '[&_button]:bg-teal-700 [&_button]:font-semibold [&_button]:text-surface',
  outside: 'text-ink-300',
  disabled: 'text-ink-300',
  hidden: 'invisible',
};

/** Enough room for seven 36px columns plus the popover's own padding. */
const CALENDAR_WIDTH = 276;
const CALENDAR_HEIGHT = 340;
const GAP = 4;

interface Position {
  top: number;
  left: number;
}

export interface DatePickerProps {
  /** Gregorian `YYYY-MM-DD`, or '' for empty. */
  value: string;
  /** Receives a Gregorian `YYYY-MM-DD`. */
  onChange: (value: string) => void;
  /** Earliest selectable day, Gregorian `YYYY-MM-DD`. */
  min?: string;
  /** Latest selectable day, Gregorian `YYYY-MM-DD`. */
  max?: string;
  disabled?: boolean;
  invalid?: boolean;
  /** Shown on the trigger when no day is chosen yet. */
  placeholder?: string;
  id?: string;
  'aria-label'?: string;
  className?: string;
}

export function DatePicker({
  value,
  onChange,
  min,
  max,
  disabled = false,
  invalid = false,
  placeholder,
  id,
  className,
  'aria-label': ariaLabel,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const popover = useRef<HTMLDivElement>(null);

  const selected = fromIsoDate(value);

  /* The visible month is state, not derived: without `onMonthChange` beside it,
     passing `month` to DayPicker pins the calendar open on one month and the
     arrows do nothing. It re-seeds from `value` each time the calendar opens, so
     it always opens on the chosen day rather than wherever it was left. */
  const [month, setMonth] = useState<Date | undefined>(selected);

  /* Anchored to the trigger and rendered in a portal, because an absolutely
     positioned popover is clipped by any scrolling ancestor — and these fields
     live inside `Dialog`, whose body is `overflow-y-auto`. Inside the dialog the
     calendar was cut off and the dialog grew scrollbars around it. Flips above
     the field when there is no room below. */
  const place = useCallback(() => {
    const anchor = trigger.current?.getBoundingClientRect();
    if (!anchor) return;
    const below = window.innerHeight - anchor.bottom;
    const top =
      below < CALENDAR_HEIGHT + GAP && anchor.top > CALENDAR_HEIGHT + GAP
        ? anchor.top - CALENDAR_HEIGHT - GAP
        : anchor.bottom + GAP;
    // Keep the calendar on screen when the field sits near an edge.
    const left = Math.max(
      GAP,
      Math.min(anchor.left, window.innerWidth - CALENDAR_WIDTH - GAP),
    );
    setPosition({ top, left });
  }, []);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;

    function onPointer(event: MouseEvent) {
      const target = event.target as Node;
      if (trigger.current?.contains(target) || popover.current?.contains(target)) {
        return;
      }
      setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    // `true` so a scroll inside the dialog body moves the calendar with it.
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open, place]);

  function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    setMonth(fromIsoDate(value));
    setOpen(true);
  }

  const lower = fromIsoDate(min ?? '');
  const upper = fromIsoDate(max ?? '');

  return (
    <div className={cn('relative', className)}>
      <button
        ref={trigger}
        type="button"
        id={id}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-invalid={invalid || undefined}
        onClick={toggle}
        className={cn(
          'flex h-10 w-full items-center gap-2 rounded-md border px-3 text-start text-base',
          disabled ? 'cursor-not-allowed bg-canvas' : 'cursor-pointer bg-surface',
          invalid ? 'border-danger' : 'border-default',
          selected ? 'text-ink-900' : 'text-ink-400',
        )}
      >
        <Icon name="calendar-days" size={16} className="shrink-0 text-ink-400" />
        <span className="flex-1 truncate">
          {selected ? formatHijriDate(selected) : (placeholder ?? '')}
        </span>
      </button>

      {open && position
        ? createPortal(
            <div
              ref={popover}
              role="dialog"
              aria-label={ariaLabel}
              style={{ top: position.top, left: position.left, width: CALENDAR_WIDTH }}
              className="fixed z-50 rounded-lg border border-default bg-surface p-2 shadow-modal motion-safe:animate-[ef-dialog-in_var(--dur-fast)_var(--ease-standard)]"
            >
              <DayPicker
                mode="single"
                /* Every date field here wants a date. Without `required`,
                   clicking the day already chosen *clears* it and leaves the
                   calendar open, which reads as the click not registering.
                   Required makes that click confirm the day and close. */
                required
                selected={selected}
                month={month}
                onMonthChange={setMonth}
                startMonth={lower}
                endMonth={upper}
                disabled={[
                  ...(lower ? [{ before: lower }] : []),
                  ...(upper ? [{ after: upper }] : []),
                ]}
                onSelect={(day) => {
                  onChange(toIsoDate(day));
                  setOpen(false);
                }}
                classNames={CALENDAR_CLASSES}
              />
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
