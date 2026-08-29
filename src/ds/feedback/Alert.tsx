import type { HTMLAttributes, ReactNode } from 'react';
import { Icon, type IconName } from '../core/Icon';
import { cn } from '../cn';

const TONES = {
  info: { className: 'bg-info-bg border-info-line', fg: 'text-info', icon: 'info' },
  success: { className: 'bg-success-bg border-success-line', fg: 'text-success', icon: 'circle-check' },
  warning: { className: 'bg-warning-bg border-gold-200', fg: 'text-warning', icon: 'triangle-alert' },
  danger: { className: 'bg-danger-bg border-danger-line', fg: 'text-danger', icon: 'octagon-alert' },
} as const satisfies Record<string, { className: string; fg: string; icon: IconName }>;

export interface AlertProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  tone?: keyof typeof TONES;
  title?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
}

/** Inline banner for page-level messages and validation summaries. */
export function Alert({ tone = 'info', title, action, className, children, ...rest }: AlertProps) {
  const t = TONES[tone];
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('flex items-start gap-3 rounded-md border px-4 py-3', t.className, className)}
      {...rest}
    >
      <Icon name={t.icon} size={18} className={cn('mt-[3px]', t.fg)} />
      <div className="min-w-0 flex-1">
        {title ? (
          <div className={cn('text-sm font-semibold text-ink-900', children && 'mb-0.5')}>{title}</div>
        ) : null}
        {children ? <div className="text-sm leading-body text-ink-700">{children}</div> : null}
      </div>
      {action}
    </div>
  );
}
