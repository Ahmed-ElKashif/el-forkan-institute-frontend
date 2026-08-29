import type { HTMLAttributes, ReactNode } from 'react';
import { Icon } from '../core/Icon';
import { cn } from '../cn';

export interface LockBannerProps extends HTMLAttributes<HTMLDivElement> {
  locked?: boolean;
  lockedAt?: string;
  lockedBy?: string;
  action?: ReactNode;
}

/** Exam lock state.
 *  Locked, every field takes its read-only skin and changes must go through the
 *  correction dialog. Unlock is head-teacher only, so `action` is normally
 *  wrapped in a RoleGate by the caller. */
export function LockBanner({
  locked = true,
  lockedAt,
  lockedBy,
  action,
  className,
  ...rest
}: LockBannerProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-md border px-4 py-3',
        locked ? 'border-teal-200 bg-teal-50' : 'border-gold-200 bg-warning-bg',
        className,
      )}
      {...rest}
    >
      <Icon
        name={locked ? 'lock' : 'lock-open'}
        size={18}
        className={locked ? 'text-teal-700' : 'text-warning'}
      />
      <div className="flex-1">
        <div className="text-sm font-semibold text-ink-900">
          {locked ? 'الامتحان مقفل' : 'الامتحان مفتوح للإدخال'}
        </div>
        <div className="ef-num text-xs text-ink-500">
          {locked
            ? 'أي تعديل بعد القفل يتم عبر نافذة التصحيح ويسجَّل في سجل التغييرات' +
              (lockedAt ? ` · قُفل في ${lockedAt}` : '') +
              (lockedBy ? ` بواسطة ${lockedBy}` : '')
            : 'الدرجات قابلة للتعديل حتى يقفل المدير الامتحان'}
        </div>
      </div>
      {action}
    </div>
  );
}
