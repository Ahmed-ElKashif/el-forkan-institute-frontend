import { Fragment, type HTMLAttributes, type ReactNode } from 'react';
import { Logo } from './Logo';
import { cn } from '../cn';

export interface SheetMeta {
  label: string;
  value: ReactNode;
}

export interface PrintSheetProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title: ReactNode;
  meta?: SheetMeta[];
  footerNote?: ReactNode;
  logoSrc?: string;
  children?: ReactNode;
}

/** A4 portrait RTL administrative sheet — roster and result printouts.
 *  Ivory ground, a gold rule under the header, and no fills that eat toner. */
export function PrintSheet({
  title,
  meta = [],
  footerNote,
  logoSrc,
  className,
  children,
  ...rest
}: PrintSheetProps) {
  return (
    <div
      className={cn(
        'ef-print-sheet box-border w-[210mm] min-h-[297mm] border border-ceremony-line bg-paper p-[14mm] text-[10.5pt] text-ink-900',
        className,
      )}
      {...rest}
    >
      <header className="flex items-center gap-4 border-b-2 border-gold-300 pb-3">
        <Logo variant="mark" height={52} src={logoSrc} />
        <div className="flex-1">
          <div className="text-xs text-gold-700">دورات الفرقان التثقيفية</div>
          <h1 className="text-xl text-teal-700">{title}</h1>
        </div>
        <dl className="m-0 grid grid-cols-[auto_auto] gap-x-3 gap-y-0.5 text-xs text-ink-500">
          {meta.map((m) => (
            <Fragment key={m.label}>
              <dt>{m.label}</dt>
              <dd className="ef-num m-0 text-ink-900">{m.value}</dd>
            </Fragment>
          ))}
        </dl>
      </header>

      <div className="py-4">{children}</div>

      {footerNote ? (
        <footer className="border-t border-gold-200 pt-3 text-xs text-ink-500">{footerNote}</footer>
      ) : null}
    </div>
  );
}
