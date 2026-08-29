import type { ImgHTMLAttributes } from 'react';
import { cn } from '../cn';

export interface LogoProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'height'> {
  /** `full` is the lockup with the word-mark; `mark` is the arch alone. */
  variant?: 'full' | 'mark';
  height?: number;
}

/** The institute mark.
 *  Never redrawn, recoloured, rotated or mirrored — it stays exactly as
 *  supplied in every direction context. On the deep-teal sidebar it sits on a
 *  light panel rather than being knocked out. */
export function Logo({
  variant = 'full',
  height = 48,
  src,
  alt = 'دورات الفرقان التثقيفية',
  className,
  ...rest
}: LogoProps) {
  const source = src ?? (variant === 'mark' ? '/assets/logo-mark.png' : '/assets/logo-full.png');
  return (
    <img
      src={source}
      alt={alt}
      style={{ height }}
      className={cn('block w-auto', className)}
      {...rest}
    />
  );
}
