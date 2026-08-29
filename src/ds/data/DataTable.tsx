import type { HTMLAttributes, ReactNode } from 'react';
import { Icon } from '../core/Icon';
import { cn } from '../cn';

export type Density = 'comfortable' | 'compact';
export type RowTone = 'danger' | 'warning' | 'success' | 'brand';

export interface Column<T> {
  key: string;
  header: ReactNode;
  width?: number | string;
  align?: 'start' | 'center' | 'end';
  /** Tabular Latin digits for this column. */
  numeric?: boolean;
  /** Pins the column to the inline-start edge — the student name. */
  sticky?: boolean;
  render?: (row: T, index: number) => ReactNode;
}

export interface DataTableProps<T> extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  columns: Column<T>[];
  rows: T[];
  /** compact = 32px rows (grids, previews) · comfortable = 48px (lists). */
  density?: Density;
  getRowKey?: (row: T, index: number) => string | number;
  rowTone?: (row: T) => RowTone | undefined;
  empty?: ReactNode;
}

const ROW_TONE: Record<RowTone, string> = {
  danger: 'bg-danger-bg',
  warning: 'bg-warning-bg',
  success: 'bg-success-bg',
  brand: 'bg-teal-50',
};

const ALIGN = {
  start: 'text-start',
  center: 'text-center',
  end: 'text-end',
} as const;

/* The header row is always sticky; `sticky` on a column pins it too. That
   pairing is what makes the attendance grid usable on a phone.

   Nothing here holds state or listens for pointer events — the grid renders
   hundreds of cells, so hover and selection are CSS, never React re-renders. */
export function DataTable<T>({
  columns,
  rows,
  density = 'comfortable',
  getRowKey,
  rowTone,
  empty,
  className,
  ...rest
}: DataTableProps<T>) {
  const compact = density === 'compact';
  const cellPad = compact ? 'px-2' : 'px-3';

  return (
    <div
      className={cn('overflow-auto rounded-lg border border-subtle bg-surface', className)}
      {...rest}
    >
      <table
        className={cn(
          'w-full border-separate border-spacing-0',
          compact ? 'text-sm' : 'text-base',
        )}
      >
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                style={{ width: c.width }}
                className={cn(
                  'sticky top-0 whitespace-nowrap border-b border-default bg-canvas',
                  'text-xs font-semibold text-ink-500',
                  compact ? 'h-8' : 'h-10',
                  cellPad,
                  ALIGN[c.align ?? 'start'],
                  c.sticky ? 'z-3 start-0' : 'z-2',
                )}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="p-8 text-center text-ink-500">
                {empty ?? 'لا توجد بيانات'}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => {
              const tone = rowTone?.(row);
              return (
                <tr key={getRowKey ? getRowKey(row, i) : i} className={tone ? ROW_TONE[tone] : undefined}>
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={cn(
                        'border-b border-subtle text-ink-700',
                        compact ? 'h-8 whitespace-nowrap' : 'h-12',
                        cellPad,
                        ALIGN[c.align ?? 'start'],
                        c.numeric && 'ef-num',
                        c.sticky && ['sticky start-0 z-1 font-semibold', tone ? ROW_TONE[tone] : 'bg-surface'],
                      )}
                    >
                      {c.render ? c.render(row, i) : (row as Record<string, ReactNode>)[c.key]}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

export interface SortHeaderProps {
  label: ReactNode;
  dir?: 'asc' | 'desc';
}

/** Sortable column header content. */
export function SortHeader({ label, dir }: SortHeaderProps) {
  return (
    <span className="inline-flex items-center gap-1">
      {label}
      <Icon name={dir === 'desc' ? 'arrow-down' : 'arrow-up'} size={12} className={dir ? undefined : 'opacity-30'} />
    </span>
  );
}
