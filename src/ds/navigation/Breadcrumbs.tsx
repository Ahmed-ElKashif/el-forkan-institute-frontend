import { Fragment, type HTMLAttributes } from 'react';
import { Icon } from '../core/Icon';
import { cn } from '../cn';

export interface Crumb {
  label: string;
  href?: string;
}

export interface BreadcrumbsProps extends HTMLAttributes<HTMLElement> {
  items?: Crumb[];
}

/** Trail for nested records. The separator mirrors with the text direction. */
export function Breadcrumbs({ items = [], className, ...rest }: BreadcrumbsProps) {
  return (
    <nav
      aria-label="مسار التنقل"
      className={cn('flex items-center gap-2 text-xs text-ink-500', className)}
      {...rest}
    >
      {items.map((item, n) => (
        <Fragment key={item.label}>
          {n > 0 ? <Icon name="chevron-left" size={12} mirror className="opacity-60" /> : null}
          {n === items.length - 1 ? (
            <span className="font-semibold text-ink-700">{item.label}</span>
          ) : (
            // A trail link reads as a link: brand colour + underline on hover,
            // so it is not mistaken for the plain-grey trail/separators.
            <a
              href={item.href ?? '#'}
              className="rounded-sm text-brand-text hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              {item.label}
            </a>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
