import type { HTMLAttributes, ReactNode } from 'react';
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
}

/** Transient confirmation of a completed write.
 *  Formal wording, no exclamation marks — "تم حفظ الحضور", never "تمام!". */
export function Toast({ tone = 'success', message, detail, onDismiss, className, ...rest }: ToastProps) {
  const t = TONES[tone];
  return (
    <div
      role="status"
      className={cn(
        'flex min-w-80 max-w-110 items-start gap-3 rounded-md border border-subtle bg-surface px-4 py-3 shadow-modal',
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
  );
}
