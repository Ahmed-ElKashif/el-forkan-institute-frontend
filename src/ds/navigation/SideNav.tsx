import type { HTMLAttributes, ReactNode } from 'react';
import { Icon, type IconName } from '../core/Icon';
import { cn } from '../cn';

export type Role = 'head_teacher' | 'teacher';

export interface NavItem {
  key: string;
  label: string;
  icon: IconName;
  badge?: number | string;
  /** Removed entirely for teachers. Never rendered disabled. */
  headTeacherOnly?: boolean;
  group?: string;
}

export interface SideNavProps extends Omit<HTMLAttributes<HTMLElement>, 'onSelect'> {
  items?: NavItem[];
  active?: string;
  role?: Role;
  onSelect?: (key: string) => void;
  footer?: ReactNode;
  logoSrc?: string;
}

/** Role-scoped sidebar on the deep-teal ground.
 *
 *  Items marked `headTeacherOnly` are filtered out for teachers — the teacher's
 *  sidebar is genuinely shorter, never a list of disabled links. 54 of the
 *  API's 115 routes are head-teacher-only. */
export function SideNav({
  items = [],
  active,
  role = 'head_teacher',
  onSelect,
  footer,
  logoSrc = '/assets/logo-mark.png',
  className,
  ...rest
}: SideNavProps) {
  const visible = items.filter((i) => !(i.headTeacherOnly && role !== 'head_teacher'));

  const groups: { name: string; items: NavItem[] }[] = [];
  for (const item of visible) {
    const name = item.group ?? '';
    const existing = groups.find((g) => g.name === name);
    if (existing) existing.items.push(item);
    else groups.push({ name, items: [item] });
  }

  return (
    <nav
      className={cn('flex w-66 shrink-0 flex-col bg-nav text-on-nav', className)}
      {...rest}
    >
      <div className="flex items-center gap-3 border-b border-nav-line px-5 py-4">
        {/* The logo is a supplied raster: never redrawn, recoloured or mirrored. */}
        <img src={logoSrc} alt="" className="h-8.5 w-auto" />
        <div className="leading-heading">
          <div className="text-sm font-bold">دورات الفرقان</div>
          <div className="text-xs text-nav-dim">نظام إدارة المعهد</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pt-3 pb-6">
        {groups.map((g, gi) => (
          <div key={g.name || gi} className="mb-4">
            {g.name ? (
              <div className="mb-1.5 px-3 text-xs text-nav-group">{g.name}</div>
            ) : null}
            <ul className="m-0 grid list-none gap-0.5 p-0">
              {g.items.map((i) => {
                const on = active === i.key;
                return (
                  <li key={i.key}>
                    <button
                      type="button"
                      onClick={() => onSelect?.(i.key)}
                      aria-current={on ? 'page' : undefined}
                      className={cn(
                        'relative flex h-10 w-full cursor-pointer items-center gap-3 rounded-md border-none px-3 text-start text-sm',
                        'transition-colors duration-[var(--dur-fast)] ease-standard',
                        on
                          ? 'bg-teal-600 font-semibold text-white'
                          : 'bg-transparent font-normal text-nav-idle hover:bg-teal-700 hover:text-white',
                      )}
                    >
                      {/* Active marker: a crisp bar on the inline-start edge. */}
                      {on ? (
                        <span
                          aria-hidden="true"
                          className="absolute inset-y-1.5 start-0 w-1 rounded-full bg-white"
                        />
                      ) : null}
                      <Icon name={i.icon} size={18} />
                      <span className="flex-1">{i.label}</span>
                      {i.badge != null ? (
                        <span className="ef-num rounded-full bg-nav-badge px-1.5 text-xs">{i.badge}</span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {footer ? <div className="border-t border-nav-line p-4">{footer}</div> : null}
    </nav>
  );
}
