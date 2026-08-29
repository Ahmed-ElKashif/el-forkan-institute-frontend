import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../cn';

export interface CardProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title?: ReactNode;
  action?: ReactNode;
  /** `ceremony` switches to ivory paper + gold rule — certificates only. */
  tone?: 'default' | 'ceremony';
  /** Tailwind padding classes for the body. */
  bodyClassName?: string;
  children?: ReactNode;
}

/** Standard surface: white, 1px hairline, 12px radius, whisper-thin shadow.
 *  The header is separated by a hairline, never a colour block, and there are
 *  no coloured left-border accents anywhere in this system. */
export function Card({
  title,
  action,
  tone = 'default',
  bodyClassName = 'p-6',
  className,
  children,
  ...rest
}: CardProps) {
  const ceremony = tone === 'ceremony';
  return (
    <section
      className={cn(
        'overflow-hidden rounded-lg border shadow-card',
        ceremony ? 'bg-paper border-ceremony-line' : 'bg-surface border-subtle',
        className,
      )}
      {...rest}
    >
      {title || action ? (
        <header
          className={cn(
            'flex items-center justify-between gap-4 border-b px-6 py-4',
            ceremony ? 'border-ceremony-line' : 'border-subtle',
          )}
        >
          <h3 className="text-lg font-semibold text-ink-900">{title}</h3>
          {action}
        </header>
      ) : null}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}
