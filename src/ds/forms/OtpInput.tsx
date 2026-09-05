import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react';
import { cn } from '../cn';

export interface OtpInputProps {
  /** The code so far — the source of truth; boxes render `value[i]`. */
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
  invalid?: boolean;
  autoFocus?: boolean;
  /** Names the group for assistive tech; each box appends its position. */
  ariaLabel?: string;
}

const DIGITS = /\d/g;

/** Segmented one-time-code entry: `length` single-digit boxes, digits only,
 *  with the auto-advance, backspace and paste behaviour of a standard OTP field.
 *  Controlled — `value` is the whole code and each box shows one character, so
 *  there is no per-box state to fall out of sync. LTR because a numeric code
 *  reads left-to-right even on an RTL page. */
export function OtpInput({
  value,
  onChange,
  length = 6,
  disabled = false,
  invalid = false,
  autoFocus = false,
  ariaLabel,
}: OtpInputProps) {
  const boxes = useRef<Array<HTMLInputElement | null>>([]);
  const chars = Array.from({ length }, (_, i) => value[i] ?? '');

  function focusBox(index: number) {
    boxes.current[Math.max(0, Math.min(length - 1, index))]?.focus();
  }

  /** Digits only, capped to `length`; fires onChange with the whole code. */
  function commit(next: string): string {
    const clean = (next.match(DIGITS)?.join('') ?? '').slice(0, length);
    onChange(clean);
    return clean;
  }

  // A keystroke delivers one digit; autofill/paste can deliver several. Either
  // way, write them from this box onward and land focus after the last filled.
  function handleInput(index: number, raw: string) {
    const digits = raw.match(DIGITS)?.join('') ?? '';
    if (digits === '') return;
    const next = [...chars];
    let cursor = index;
    for (const digit of digits) {
      if (cursor >= length) break;
      next[cursor] = digit;
      cursor += 1;
    }
    commit(next.join(''));
    focusBox(cursor);
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace') {
      event.preventDefault();
      const next = [...chars];
      if (next[index]) {
        next[index] = '';
        commit(next.join(''));
      } else if (index > 0) {
        next[index - 1] = '';
        commit(next.join(''));
        focusBox(index - 1);
      }
    } else if (event.key === 'ArrowLeft') {
      focusBox(index - 1);
    } else if (event.key === 'ArrowRight') {
      focusBox(index + 1);
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const digits = event.clipboardData.getData('text').match(DIGITS)?.join('') ?? '';
    if (digits === '') return;
    focusBox(commit(digits).length);
  }

  return (
    <div dir="ltr" role="group" aria-label={ariaLabel} className="flex justify-center gap-2">
      {chars.map((char, index) => (
        <input
          key={index}
          ref={(el) => {
            boxes.current[index] = el;
          }}
          value={char}
          disabled={disabled}
          autoFocus={autoFocus && index === 0}
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          aria-label={ariaLabel ? `${ariaLabel} ${index + 1}` : undefined}
          aria-invalid={invalid || undefined}
          maxLength={1}
          // Select on focus so typing over a filled box replaces its digit.
          onFocus={(e) => e.target.select()}
          onChange={(e) => handleInput(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          className={cn(
            'ef-num h-12 w-11 rounded-md border text-center text-xl font-semibold text-ink-900',
            'transition-colors focus:border-brand',
            invalid ? 'border-danger' : 'border-default',
            disabled ? 'cursor-not-allowed bg-canvas' : 'bg-surface',
          )}
        />
      ))}
    </div>
  );
}
