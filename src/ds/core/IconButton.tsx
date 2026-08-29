import type { ButtonHTMLAttributes } from 'react';
import { Icon, type IconName } from './Icon';
import { cn } from '../cn';

const VARIANTS = {
  ghost:
    'text-ink-500 bg-transparent border-transparent hover:bg-line-200 ' +
    'disabled:bg-transparent disabled:text-ink-400',
  outline:
    'text-brand-text bg-transparent border-default hover:bg-teal-50 ' +
    'disabled:bg-transparent disabled:text-ink-400',
  solid:
    'text-white bg-brand border-brand hover:bg-brand-hover ' +
    'disabled:bg-brand-disabled disabled:text-white',
} as const;

const SIZES = { sm: 'size-8', md: 'size-10', lg: 'size-12' } as const;
const ICON_SIZE = { sm: 14, md: 18, lg: 22 } as const;

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  icon: IconName;
  /** Required — becomes both aria-label and title. */
  label: string;
  size?: keyof typeof SIZES;
  variant?: keyof typeof VARIANTS;
  mirror?: boolean;
}

/** Square icon-only control. */
export function IconButton({
  icon,
  label,
  size = 'md',
  variant = 'ghost',
  mirror = false,
  disabled = false,
  className,
  ...rest
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      className={cn(
        'inline-grid place-items-center rounded-md border cursor-pointer',
        'transition-colors duration-[var(--dur-fast)] ease-standard disabled:cursor-not-allowed',
        SIZES[size],
        VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      <Icon name={icon} size={ICON_SIZE[size]} mirror={mirror} />
    </button>
  );
}
