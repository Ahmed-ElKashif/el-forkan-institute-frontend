import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import { cn } from '../cn';

/* Hover and press are CSS variants, not React state. The handoff bundle drove
   them from onMouseEnter/onMouseLeave, which re-renders on every hover and
   never fires for keyboard focus or touch. */
/* Filled variants carry a soft shadow so a button reads as a raised, tappable
   surface rather than a coloured label; secondary sits on its own surface (not
   transparent) so it never reads as a link; ghost alone stays flat by design.
   disabled drops the shadow so a dead control never looks pressable. */
const VARIANTS = {
  primary:
    'bg-brand text-on-brand border-brand shadow-raised hover:bg-brand-hover active:bg-brand-pressed ' +
    'disabled:bg-brand-disabled disabled:border-brand-disabled disabled:text-white disabled:shadow-none',
  secondary:
    'bg-surface text-brand-text border-default shadow-card hover:bg-teal-50 active:bg-teal-100 ' +
    'disabled:bg-surface disabled:border-subtle disabled:text-ink-400 disabled:shadow-none',
  ghost:
    'bg-transparent text-ink-700 border-transparent hover:bg-line-200 active:bg-line-300 ' +
    'disabled:bg-transparent disabled:border-subtle disabled:text-ink-400',
  danger:
    'bg-danger text-white border-danger shadow-raised hover:bg-danger-hover active:bg-danger-pressed ' +
    'disabled:bg-transparent disabled:border-subtle disabled:text-white disabled:shadow-none',
  /* Ceremony gold — certificates, seals, issuance. Never a generic action.
     This variant exists so that misuse is visible in review. */
  ceremony:
    'bg-accent text-white border-accent shadow-raised hover:bg-accent-hover active:bg-accent-pressed ' +
    'disabled:bg-transparent disabled:border-subtle disabled:text-white disabled:shadow-none',
} as const;

const SIZES = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-base',
  lg: 'h-12 px-6 text-lg',
} as const;

const ICON_SIZE = { sm: 16, md: 18, lg: 20 } as const;

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  icon?: IconName;
  /** Directional icons (log-out, arrows) must mirror in RTL. */
  iconMirror?: boolean;
  iconPosition?: 'start' | 'end';
  loading?: boolean;
  fullWidth?: boolean;
  type?: 'button' | 'submit' | 'reset';
  children?: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconMirror = false,
  iconPosition = 'start',
  loading = false,
  disabled = false,
  fullWidth = false,
  type = 'button',
  className,
  children,
  ...rest
}: ButtonProps) {
  const off = disabled || loading;
  return (
    <button
      type={type}
      disabled={off}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md border font-semibold leading-none',
        'cursor-pointer transition-[color,background-color,border-color,box-shadow,transform] duration-[var(--dur-fast)] ease-standard',
        // Tactile press: the button dips a hair when held.
        'active:translate-y-px disabled:translate-y-0 disabled:cursor-not-allowed',
        iconPosition === 'end' && 'flex-row-reverse',
        fullWidth && 'w-full',
        SIZES[size],
        VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      {icon || loading ? (
        <Icon
          name={loading ? 'loader-circle' : (icon as IconName)}
          size={ICON_SIZE[size]}
          mirror={iconMirror}
          className={loading ? 'motion-safe:animate-spin' : undefined}
        />
      ) : null}
      <span>{children}</span>
    </button>
  );
}
