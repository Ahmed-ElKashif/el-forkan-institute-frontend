import type { HTMLAttributes, ReactNode } from 'react';
import { ArchPanel } from './ArchPanel';
import { cn } from '../cn';

export interface BrandLoaderProps extends HTMLAttributes<HTMLDivElement> {
  /** e.g. "مرحبًا بك، أحمد". */
  greeting?: ReactNode;
  /** The institute word-mark line. */
  institute?: ReactNode;
  subtitle?: ReactNode;
  /** The honest "still working" caption beside the progress bar. */
  loadingLabel?: ReactNode;
  /** When true the whole overlay dissolves out (driven by useExitTransition). */
  closing?: boolean;
  logoSrc?: string;
}

/** Full-screen ceremonial splash on the deep-teal ground. Built for the
 *  first-login welcome — a once-per-device moment, which is the one place in
 *  this otherwise restrained product that spends a real motion budget.
 *
 *  The supplied mark is never redrawn or recoloured: it sits on a light arch
 *  panel (the brand's rule for the logo on teal) and inscribes itself from the
 *  base up via a clip reveal. Every entrance uses fill `both`, so under
 *  `prefers-reduced-motion` each element renders straight to its resting state. */
export function BrandLoader({
  greeting,
  institute,
  subtitle,
  loadingLabel,
  closing = false,
  logoSrc = '/assets/logo-mark.png',
  className,
  ...rest
}: BrandLoaderProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        'ef-no-print fixed inset-0 z-[100] grid place-items-center bg-teal-800 px-6 text-center text-white',
        closing
          ? 'motion-safe:animate-[ef-welcome-out_360ms_var(--ease-out)_forwards]'
          : 'motion-safe:animate-[ef-fade-in_var(--dur-base)_var(--ease-out)]',
        className,
      )}
      {...rest}
    >
      <div className="grid justify-items-center gap-6">
        <ArchPanel
          tone="teal"
          width={188}
          height={216}
          className="overflow-hidden bg-teal-50 shadow-modal motion-safe:animate-[ef-welcome-rise_600ms_var(--ease-standard)_both]"
        >
          {/* The real mark, inscribing itself book-first, dome-last. */}
          <img
            src={logoSrc}
            alt=""
            className="block h-auto w-36 motion-safe:animate-[ef-logo-reveal_900ms_var(--ease-standard)_150ms_both]"
          />
        </ArchPanel>

        {/* The open book's rule, growing outward from the spine. */}
        <span
          aria-hidden="true"
          className="h-0.5 w-28 origin-center rounded-full bg-gold-400 motion-safe:animate-[ef-rule-grow_400ms_var(--ease-out)_750ms_both]"
        />

        <div className="grid justify-items-center gap-1.5">
          {institute ? (
            <div className="text-2xl font-bold leading-tight text-white motion-safe:animate-[ef-welcome-rise_500ms_var(--ease-standard)_900ms_both]">
              {institute}
            </div>
          ) : null}
          {subtitle ? (
            <div className="text-sm text-teal-100 motion-safe:animate-[ef-welcome-rise_500ms_var(--ease-standard)_1000ms_both]">
              {subtitle}
            </div>
          ) : null}
          {greeting ? (
            <div className="mt-2 text-base text-teal-50 motion-safe:animate-[ef-welcome-rise_500ms_var(--ease-standard)_1100ms_both]">
              {greeting}
            </div>
          ) : null}
        </div>

        {/* Indeterminate gold loading track — a static gold fill under reduced
            motion, a sweeping highlight otherwise. */}
        <div className="grid justify-items-center gap-2 motion-safe:animate-[ef-welcome-rise_500ms_var(--ease-standard)_1200ms_both]">
          <div className="relative h-1 w-40 overflow-hidden rounded-full bg-teal-700 motion-reduce:bg-gold-400/60 rtl:-scale-x-100">
            <span
              aria-hidden="true"
              className="absolute inset-y-0 w-2/5 rounded-full bg-gold-400 motion-reduce:hidden motion-safe:animate-[ef-loader-sweep_1.4s_linear_infinite]"
            />
          </div>
          {loadingLabel ? (
            <div className="ef-num text-xs text-teal-100">{loadingLabel}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
