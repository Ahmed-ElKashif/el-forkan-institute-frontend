import type { HTMLAttributes, ReactNode } from 'react';
import { Icon } from '../core/Icon';
import { Button } from '../core/Button';
import { cn } from '../cn';

const COUNT_TONE = {
  create: 'text-success',
  update: 'text-info',
  skip: 'text-ink-500',
  error: 'text-danger',
} as const;

export interface CommitCount {
  label: string;
  value: ReactNode;
  tone?: keyof typeof COUNT_TONE;
}

export interface CommitBarProps extends HTMLAttributes<HTMLDivElement> {
  counts?: CommitCount[];
  note?: ReactNode;
  confirmLabel?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  disabled?: boolean;
}

/** The commit rail of the preview → confirm pattern, shared by import,
 *  promotion and certificate issuance.
 *
 *  It summarises what will be written and then commits. `disabled` is for
 *  genuinely unavailable actions — unresolved errors in the preview — never
 *  for permissions, which remove the control entirely. */
export function CommitBar({
  counts = [],
  note,
  confirmLabel = 'تنفيذ',
  onConfirm,
  onCancel,
  disabled = false,
  className,
  ...rest
}: CommitBarProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-6 border-t border-default bg-surface px-6 py-4 shadow-rail',
        className,
      )}
      {...rest}
    >
      <div className="flex flex-wrap gap-6">
        {counts.map((c) => (
          <div key={c.label}>
            <div className="text-xs text-ink-500">{c.label}</div>
            <div className={cn('ef-num text-xl font-bold', c.tone ? COUNT_TONE[c.tone] : 'text-ink-900')}>
              {c.value}
            </div>
          </div>
        ))}
      </div>

      {note ? (
        <div className="flex min-w-50 flex-1 items-center gap-1.5 text-xs text-ink-500">
          <Icon name="info" size={14} />
          {note}
        </div>
      ) : null}

      <div className="flex gap-3 ms-auto">
        {onCancel ? (
          <Button variant="ghost" onClick={onCancel}>
            إلغاء
          </Button>
        ) : null}
        <Button variant="primary" icon="check" disabled={disabled} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </div>
  );
}
