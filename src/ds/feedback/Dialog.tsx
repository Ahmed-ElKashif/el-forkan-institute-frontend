import { useEffect, useRef, type HTMLAttributes, type ReactNode } from 'react';
import { IconButton } from '../core/IconButton';
import { useExitTransition } from '../useExitTransition';
import { cn } from '../cn';

export interface DialogProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  open?: boolean;
  title: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  /** Max inline size in px. */
  width?: number;
  onClose?: () => void;
  children?: ReactNode;
}

/** Modal shell. ConfirmDialog wraps it for destructive and history-rewriting
 *  actions; everything else composes its own body.
 *
 *  Escape and scrim-click close were added on top of the handoff prototype —
 *  a modal without them is an accessibility defect. */
export function Dialog({
  open = true,
  title,
  description,
  footer,
  width = 520,
  onClose,
  className,
  children,
  ...rest
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  // The dialog owns Escape, scrim-click and the header ✕, so those dismissals
  // animate out. Footer buttons are consumer-rendered and call the parent's
  // close directly, unmounting without this exit.
  const { closing, requestClose } = useExitTransition(onClose);

  useEffect(() => {
    if (!open || !onClose) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') requestClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose, requestClose]);

  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 grid place-items-center bg-scrim p-6',
        closing
          ? 'motion-safe:animate-[ef-fade-out_var(--dur-base)_var(--ease-out)_forwards]'
          : 'motion-safe:animate-[ef-fade-in_var(--dur-base)_var(--ease-out)]',
      )}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) requestClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        style={{ maxWidth: width }}
        className={cn(
          // Cap the panel to the viewport and scroll the body so a tall form on
          // a short phone never clips its footer/submit. dvh tracks the mobile
          // browser chrome; 3rem = the overlay's p-6 top + bottom.
          'flex max-h-[calc(100dvh-3rem)] w-full flex-col overflow-hidden rounded-lg bg-surface shadow-modal outline-none',
          closing
            ? 'motion-safe:animate-[ef-dialog-out_var(--dur-base)_var(--ease-standard)_forwards]'
            : 'motion-safe:animate-[ef-dialog-in_var(--dur-base)_var(--ease-standard)]',
          className,
        )}
        {...rest}
      >
        <header className="flex shrink-0 items-start gap-4 px-6 pt-6 pb-4">
          <div className="flex-1">
            <h2 className="text-xl font-bold">{title}</h2>
            {description ? (
              <p className="mt-1.5 mb-0 text-sm leading-body text-ink-500">{description}</p>
            ) : null}
          </div>
          {onClose ? <IconButton icon="x" label="إغلاق" size="sm" onClick={requestClose} /> : null}
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">{children}</div>

        {footer ? (
          <footer className="flex shrink-0 justify-start gap-3 border-t border-subtle bg-canvas px-6 py-4">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
}
