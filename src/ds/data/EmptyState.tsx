import type { HTMLAttributes, ReactNode } from 'react';
import { Icon, type IconName } from '../core/Icon';
import { cn } from '../cn';

export interface EmptyStateProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  icon?: IconName;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  /** `denied` is the 403 face a teacher sees on a head-teacher-only route. */
  tone?: 'default' | 'denied';
}

/** Empty / 403 / error state.
 *  The pointed-arch frame is the one ornamental echo of the logo permitted
 *  outside certificates. Copy describes the next action, calmly. */
export function EmptyState({
  icon = 'inbox',
  title,
  description,
  action,
  tone = 'default',
  className,
  ...rest
}: EmptyStateProps) {
  const denied = tone === 'denied';
  return (
    <div
      className={cn('grid justify-items-center gap-3 px-6 py-12 text-center', className)}
      {...rest}
    >
      <span
        className={cn(
          'grid h-18 w-16 place-items-center',
          'rounded-t-[50%] rounded-b-md',
          denied ? 'bg-danger-bg text-danger' : 'bg-teal-50 text-teal-600',
        )}
      >
        <Icon name={denied ? 'shield-alert' : icon} size={26} />
      </span>
      <h3 className="text-lg font-semibold">{title}</h3>
      {description ? <p className="m-0 max-w-105 text-sm text-ink-500">{description}</p> : null}
      {action}
    </div>
  );
}
