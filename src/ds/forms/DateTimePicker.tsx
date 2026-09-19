import { DatePicker } from './DatePicker';
import { Input } from './Input';
import { cn } from '../cn';

/* ---------------------------------------------------------------------------
   Hijri date + time.

   Only exams are scheduled to an instant rather than a calendar day, so this
   is the one place a time sits beside a date. It composes the two rather than
   being a second picker: the date half is the same Hijri control as everywhere
   else, and the time half is the plain `<input type="time">` the schedule
   screens already use.

   The value is an ISO instant (`exams.scheduled_at` is timestamptz), split
   into its local date and time parts for editing and recomposed on change —
   which is what the native `datetime-local` did implicitly.
--------------------------------------------------------------------------- */

export interface DateTimePickerProps {
  /** ISO instant, or '' when unset. */
  value: string;
  /** Receives an ISO instant, or '' while either half is still empty. */
  onChange: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  datePlaceholder?: string;
  'aria-label'?: string;
  className?: string;
}

/** Splits an ISO instant into the local `YYYY-MM-DD` and `HH:mm` a person
 *  edits. Local, not UTC: an exam at 09:00 in Cairo must read as 09:00. */
function splitLocal(value: string): { date: string; time: string } {
  if (value === '') return { date: '', time: '' };
  const instant = new Date(value);
  if (Number.isNaN(instant.getTime())) return { date: '', time: '' };
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    date: `${instant.getFullYear()}-${pad(instant.getMonth() + 1)}-${pad(instant.getDate())}`,
    time: `${pad(instant.getHours())}:${pad(instant.getMinutes())}`,
  };
}

export function DateTimePicker({
  value,
  onChange,
  disabled = false,
  invalid = false,
  datePlaceholder,
  className,
  'aria-label': ariaLabel,
}: DateTimePickerProps) {
  const { date, time } = splitLocal(value);

  /* Both halves are needed before there is an instant to report. Emitting ''
     until then keeps "no date yet" distinct from "midnight", which is a real
     time an exam could be at. */
  function emit(nextDate: string, nextTime: string) {
    if (nextDate === '' || nextTime === '') {
      onChange('');
      return;
    }
    const [hours, minutes] = nextTime.split(':').map(Number);
    const [year, month, day] = nextDate.split('-').map(Number);
    onChange(new Date(year, month - 1, day, hours, minutes).toISOString());
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <DatePicker
        value={date}
        onChange={(next) => emit(next, time)}
        disabled={disabled}
        invalid={invalid}
        placeholder={datePlaceholder}
        aria-label={ariaLabel}
        className="min-w-52 flex-1"
      />
      <Input
        type="time"
        value={time}
        disabled={disabled}
        invalid={invalid}
        onChange={(event) => emit(date, event.target.value)}
        aria-label={ariaLabel}
        className="w-32"
      />
    </div>
  );
}
