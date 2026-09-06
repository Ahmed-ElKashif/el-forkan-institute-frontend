import { useCallback, useState, type HTMLAttributes, type ReactNode } from 'react';
import { Icon } from '../core/Icon';
import { ActionMenu, ContextMenu, type ActionItem } from '../core/Menu';
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
  /** Makes the whole row a click target (e.g. open a detail page). Clicks that
   *  land on an interactive cell — a link, button, or the status dropdown — are
   *  left to that control, so an inline edit never doubles as navigation. */
  onRowClick?: (row: T) => void;
  /** Per-row actions. Rendered as a trailing 3-dots menu, and — for the same
   *  row — opened on right-click as a context menu. Return [] to show none. */
  rowActions?: (row: T) => ActionItem[];
  empty?: ReactNode;
}

/** True when the click originated inside a control that owns its own behaviour,
 *  so a row-level handler should stand down. */
function hitInteractive(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest('a,button,select,input,textarea,label,[role="button"]') !== null
  );
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

   Hover and selection are CSS, never React re-renders — the grid renders
   hundreds of cells. The one piece of state is the right-click context menu,
   which only changes on a right-click, not on hover. */
export function DataTable<T>({
  columns,
  rows,
  density = 'comfortable',
  getRowKey,
  rowTone,
  onRowClick,
  rowActions,
  empty,
  className,
  ...rest
}: DataTableProps<T>) {
  const compact = density === 'compact';
  const cellPad = compact ? 'px-2' : 'px-3';
  const [menu, setMenu] = useState<{ x: number; y: number; items: ActionItem[] } | null>(null);
  const closeMenu = useCallback(() => setMenu(null), []);
  const columnCount = columns.length + (rowActions ? 1 : 0);

  return (
    <div
      className={cn('overflow-auto rounded-lg border border-default bg-surface', className)}
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
                  'text-sm font-semibold text-ink-500',
                  compact ? 'h-8' : 'h-10',
                  cellPad,
                  ALIGN[c.align ?? 'start'],
                  c.sticky ? 'z-3 start-0' : 'z-2',
                )}
              >
                {c.header}
              </th>
            ))}
            {rowActions ? (
              <th
                scope="col"
                aria-label="إجراءات"
                style={{ width: 48 }}
                className={cn(
                  'sticky top-0 z-2 border-b border-default bg-canvas',
                  compact ? 'h-8' : 'h-10',
                  cellPad,
                )}
              />
            ) : null}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columnCount} className="p-8 text-center text-ink-500">
                {empty ?? 'لا توجد بيانات'}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => {
              const tone = rowTone?.(row);
              const actions = rowActions?.(row) ?? [];
              return (
                <tr
                  key={getRowKey ? getRowKey(row, i) : i}
                  onClick={
                    onRowClick
                      ? (e) => {
                          if (!hitInteractive(e.target)) onRowClick(row);
                        }
                      : undefined
                  }
                  onContextMenu={
                    actions.length > 0
                      ? (e) => {
                          e.preventDefault();
                          setMenu({ x: e.clientX, y: e.clientY, items: actions });
                        }
                      : undefined
                  }
                  className={cn(
                    // Full-row hover cue — the design intends hover as pure CSS,
                    // never a React re-render. A toned row keeps its semantic
                    // fill; a plain row lifts to the sunken canvas on hover.
                    'group transition-colors',
                    tone ? ROW_TONE[tone] : 'hover:bg-canvas',
                    onRowClick && 'cursor-pointer',
                  )}
                >
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={cn(
                        'border-b border-subtle text-ink-700',
                        compact ? 'h-8 whitespace-nowrap' : 'h-12',
                        cellPad,
                        ALIGN[c.align ?? 'start'],
                        c.numeric && 'ef-num',
                        // The sticky column paints its own opaque fill, so it has
                        // to echo the row hover itself to stay in step.
                        c.sticky && [
                          'sticky start-0 z-1 font-semibold',
                          tone ? ROW_TONE[tone] : 'bg-surface group-hover:bg-canvas',
                        ],
                      )}
                    >
                      {c.render ? c.render(row, i) : (row as Record<string, ReactNode>)[c.key]}
                    </td>
                  ))}
                  {rowActions ? (
                    <td
                      className={cn(
                        'border-b border-subtle text-end',
                        compact ? 'h-8' : 'h-12',
                        cellPad,
                      )}
                    >
                      <ActionMenu items={actions} />
                    </td>
                  ) : null}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
      {menu ? <ContextMenu x={menu.x} y={menu.y} items={menu.items} onClose={closeMenu} /> : null}
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
