import type { HTMLAttributes, ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import { cn } from '../cn';

const TONES = {
  neutral: 'bg-line-200 text-ink-700 border-line-300',
  brand: 'bg-teal-50 text-teal-700 border-teal-200',
  success: 'bg-success-bg text-success border-success-line',
  warning: 'bg-warning-bg text-warning border-gold-200',
  danger: 'bg-danger-bg text-danger border-danger-line',
  info: 'bg-info-bg text-info border-info-line',
  ceremony: 'bg-gold-50 text-gold-700 border-gold-200',
} as const;

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: keyof typeof TONES;
  icon?: IconName;
  size?: 'sm' | 'md';
  children?: ReactNode;
}

/** Status chip. Always pairs a glyph with the label — these grids print in B&W. */
export function Badge({ tone = 'neutral', icon, size = 'md', className, children, ...rest }: BadgeProps) {
  const sm = size === 'sm';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-semibold whitespace-nowrap leading-[1.6]',
        sm ? 'px-1.5 py-px text-xs' : 'px-2 py-[3px] text-sm',
        TONES[tone],
        className,
      )}
      {...rest}
    >
      {icon ? <Icon name={icon} size={sm ? 12 : 14} /> : null}
      {children}
    </span>
  );
}
