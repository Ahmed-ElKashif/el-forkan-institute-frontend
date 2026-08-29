import type { HTMLAttributes } from 'react';
import { cn } from '../cn';

export interface SkeletonProps extends HTMLAttributes<HTMLSpanElement> {
  rows?: number;
  height?: number | string;
  width?: number | string;
}

/** Loading placeholder — the only thing in this system that animates
 *  continuously, and it stops under `prefers-reduced-motion`. */
export function Skeleton({ rows = 1, height = 12, width = '100%', className, ...rest }: SkeletonProps) {
  return (
    <span
      role="status"
      aria-label="جارٍ التحميل"
      className={cn('grid gap-2', className)}
      {...rest}
    >
      {Array.from({ length: rows }, (_, i) => (
        <span
          key={i}
          aria-hidden="true"
          style={{
            height,
            width: i === rows - 1 && rows > 1 ? '60%' : width,
          }}
          className={cn(
            'block rounded-sm bg-[linear-gradient(90deg,var(--line-200),var(--line-300),var(--line-200))]',
            'bg-[length:200%_100%] motion-safe:animate-[ef-shimmer_1.4s_linear_infinite]',
          )}
        />
      ))}
    </span>
  );
}
