import type { HTMLAttributes, ReactNode } from 'react';
import { Icon } from '../core/Icon';
import { IconButton } from '../core/IconButton';
import type { Role } from './SideNav';
import { cn } from '../cn';

export interface TopBarUser {
  name: string;
  role: Role;
}

export interface TopBarProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Context selectors — academic year, section, term. */
  context?: ReactNode;
  actions?: ReactNode;
  user?: TopBarUser;
  onMenu?: () => void;
}

/** Page header: title, context selectors, actions, and who is signed in. */
export function TopBar({
  title,
  subtitle,
  context,
  actions,
  user,
  onMenu,
  className,
  ...rest
}: TopBarProps) {
  return (
    <header
      className={cn(
        'flex min-h-16 flex-wrap items-center gap-4 border-b border-subtle bg-surface px-6 py-3',
        className,
      )}
      {...rest}
    >
      {onMenu ? <IconButton icon="menu" label="القائمة" size="sm" onClick={onMenu} /> : null}

      <div className="min-w-50 flex-auto">
        <h1 className="whitespace-nowrap text-xl font-bold">{title}</h1>
        {subtitle ? <div className="ef-num text-xs text-ink-500">{subtitle}</div> : null}
      </div>

      {context ? <div className="flex flex-none gap-2">{context}</div> : null}

      <div className="flex flex-none items-center gap-3 ms-auto">
        {actions}
        {user ? (
          <div className="flex items-center gap-2 border-s border-subtle ps-3">
            <span className="grid size-8 place-items-center rounded-full bg-teal-50 text-teal-700">
              <Icon name="user" size={16} />
            </span>
            <div className="leading-[1.3]">
              <div className="text-xs font-semibold text-ink-900">{user.name}</div>
              <div className="text-xs text-ink-500">
                {user.role === 'head_teacher' ? 'مدير' : 'معلّم'}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}
