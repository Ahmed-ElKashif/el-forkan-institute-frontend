import { useEffect, useRef, type HTMLAttributes, type ReactNode } from 'react';
import { Icon, type IconName } from '../core/Icon';
import { IconButton } from '../core/IconButton';
import { cn } from '../cn';

const TONES = {
  success: { fg: 'text-success', icon: 'circle-check' },
  danger: { fg: 'text-danger', icon: 'octagon-alert' },
  info: { fg: 'text-info', icon: 'info' },
} as const satisfies Record<string, { fg: string; icon: IconName }>;

export interface ToastProps extends HTMLAttributes<HTMLDivElement> {
  tone?: keyof typeof TONES;
  message: ReactNode;
  detail?: ReactNode;
  onDismiss?: () => void;
  /** Auto-dismiss delay in ms; 0 keeps it until dismissed. */
  duration?: number;
}

/** Transient confirmation of a completed write. Floats at the bottom of the
 *  viewport (never in the page flow, so it shifts nothing), slides in, and
 *  clears itself after `duration`.
 *
 *  Formal wording, no exclamation marks — "تم حفظ الحضور", never "تمام!". */
export function Toast({
  tone = 'success',
  message,
  detail,
  onDismiss,
  duration = 5000,
  className,
  ...rest
}: ToastProps) {
  // Read the latest onDismiss through a ref so a parent re-render does not
  // reset the countdown; the timer restarts only when the message changes.
  const dismiss = useRef(onDismiss);
  useEffect(() => {
    dismiss.current = onDismiss;
  });
  useEffect(() => {
    if (duration <= 0) return;
    const id = setTimeout(() => dismiss.current?.(), duration);
    return () => clearTimeout(id);
  }, [duration, message]);

  const t = TONES[tone];
  return (
    <div className="ef-no-print pointer-events-none fixed inset-x-0 bottom-4 z-60 flex justify-center px-4">
      <div
        role="status"
        aria-live="polite"
        className={cn(
          'pointer-events-auto flex min-w-80 max-w-110 items-start gap-3 rounded-lg border border-default bg-surface px-4 py-3 shadow-modal',
          'motion-safe:animate-[ef-toast-in_var(--dur-base)_var(--ease-out)]',
          className,
        )}
        {...rest}
      >
        <Icon name={t.icon} size={18} className={cn('mt-0.5', t.fg)} />
        <div className="flex-1">
          <div className="text-sm font-semibold text-ink-900">{message}</div>
          {detail ? <div className="ef-num text-xs text-ink-500">{detail}</div> : null}
        </div>
        {onDismiss ? <IconButton icon="x" label="إخفاء" size="sm" onClick={onDismiss} /> : null}
      </div>
    </div>
  );
}
