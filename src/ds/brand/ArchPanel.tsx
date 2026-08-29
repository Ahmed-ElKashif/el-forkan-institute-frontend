import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../cn';

export interface ArchPanelProps extends HTMLAttributes<HTMLDivElement> {
  tone?: 'teal' | 'gold';
  width?: number;
  height?: number;
  children?: ReactNode;
}

/** The logo's pointed arch, echoed as a ceremonial surface — certificate
 *  headers, seals, empty-state frames.
 *
 *  Never on a button, never on an ordinary card. It exists as a component so
 *  the motif is not hand-rolled, and misapplied, screen by screen. */
export function ArchPanel({
  tone = 'teal',
  width = 180,
  height = 210,
  className,
  children,
  ...rest
}: ArchPanelProps) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: '50% 50% var(--radius-md) var(--radius-md) / 62% 62% var(--radius-md) var(--radius-md)',
      }}
      className={cn(
        'grid place-items-center border-2 px-4 pt-6 pb-4 text-center',
        tone === 'gold'
          ? 'border-gold-300 bg-gold-50 text-gold-700'
          : 'border-teal-300 bg-teal-50 text-teal-700',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
