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
  /** Toggle chip: renders a real button, shows its state via `active`
   *  (aria-pressed), and carries cursor + hover + focus affordances. */
  pressable?: boolean;
  /** Selected state for a `pressable` chip. */
  active?: boolean;
  children?: ReactNode;
}

const BASE =
  'inline-flex items-center gap-1 rounded-full border font-semibold whitespace-nowrap leading-[1.6]';
const SIZE = { sm: 'px-1.5 py-px text-xs', md: 'px-2 py-[3px] text-sm' } as const;

/** Status chip. Always pairs a glyph with the label — these grids print in B&W.
 *  With `pressable` it becomes a filter toggle; with `onRemove`, a removable tag. */
export function Badge({
  tone = 'neutral',
  icon,
  size = 'md',
  pressable = false,
  active = false,
  className,
  children,
  ...rest
}: BadgeProps) {
  const sm = size === 'sm';
  const iconSize = sm ? 12 : 14;
  const glyph = icon ? <Icon name={icon} size={iconSize} /> : null;

  // A toggle chip is a button: the pressed state is a solid brand fill so the
  // active filter reads clearly against the light, unpressed tones.
  if (pressable) {
    return (
      <button
        type="button"
        aria-pressed={active}
        className={cn(
          BASE,
          SIZE[size],
          'cursor-pointer transition-colors duration-[var(--dur-fast)]',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
          active
            ? 'bg-brand text-on-brand border-brand'
            : cn(TONES[tone], 'hover:brightness-95'),
          className,
        )}
        {...(rest as HTMLAttributes<HTMLButtonElement>)}
      >
        {glyph}
        {children}
      </button>
    );
  }

  return (
    <span className={cn(BASE, SIZE[size], TONES[tone], className)} {...rest}>
      {glyph}
      {children}
    </span>
  );
}
