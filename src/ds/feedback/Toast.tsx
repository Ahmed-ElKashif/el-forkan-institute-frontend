import { useEffect, useRef, type HTMLAttributes, type ReactNode } from 'react';
import { Icon, type IconName } from '../core/Icon';
import { IconButton } from '../core/IconButton';
import { useExitTransition } from '../useExitTransition';
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
  // The toast owns both dismiss paths (the countdown and the ✕), so it can play
  // a full exit before telling the parent to unmount.
  const { closing, requestClose } = useExitTransition(onDismiss);

  // Read the latest requestClose through a ref so a parent re-render does not
  // reset the countdown; the timer restarts only when the message changes.
  const close = useRef(requestClose);
  useEffect(() => {
    close.current = requestClose;
  });
  useEffect(() => {
    if (duration <= 0 || closing) return;
    // Pause while the tab is hidden — a confirmation must never expire unseen in
    // a background tab. We track the remaining time across hide/show cycles.
    let remaining = duration;
    let startedAt = Date.now();
    let id = window.setTimeout(() => close.current(), remaining);
    const onVisibility = () => {
      if (document.hidden) {
        window.clearTimeout(id);
        remaining -= Date.now() - startedAt;
      } else {
        startedAt = Date.now();
        id = window.setTimeout(() => close.current(), Math.max(0, remaining));
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [duration, message, closing]);

  const t = TONES[tone];
  return (
    <div className="ef-no-print pointer-events-none fixed inset-x-0 bottom-4 z-60 flex justify-center px-4">
      <div
        role="status"
        aria-live="polite"
        className={cn(
          'pointer-events-auto flex min-w-80 max-w-110 items-start gap-3 rounded-lg border border-default bg-surface px-4 py-3 shadow-modal',
          closing
            ? 'motion-safe:animate-[ef-toast-out_var(--dur-base)_var(--ease-out)_forwards]'
            : 'motion-safe:animate-[ef-toast-in_var(--dur-base)_var(--ease-out)]',
          className,
        )}
        {...rest}
      >
        <Icon name={t.icon} size={18} className={cn('mt-0.5', t.fg)} />
        <div className="flex-1">
          <div className="text-sm font-semibold text-ink-900">{message}</div>
          {detail ? <div className="ef-num text-xs text-ink-500">{detail}</div> : null}
        </div>
        {onDismiss ? <IconButton icon="x" label="إخفاء" size="sm" onClick={requestClose} /> : null}
      </div>
    </div>
  );
}
