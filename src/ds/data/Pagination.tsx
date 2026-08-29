import type { HTMLAttributes } from 'react';
import { IconButton } from '../core/IconButton';
import { cn } from '../cn';

export interface PaginationProps extends HTMLAttributes<HTMLDivElement> {
  page?: number;
  pageCount?: number;
  total?: number;
  onPage?: (page: number) => void;
}

/** List pager. Chevrons mirror in RTL; counts are Latin tabular digits. */
export function Pagination({
  page = 1,
  pageCount = 1,
  total,
  onPage,
  className,
  ...rest
}: PaginationProps) {
  return (
    <div
      className={cn('flex items-center justify-between gap-4 px-4 py-3 text-sm text-ink-500', className)}
      {...rest}
    >
      <span className="ef-num">{total != null ? `إجمالي ${total} سجل` : ''}</span>
      <div className="flex items-center gap-2">
        <IconButton
          icon="chevron-right"
          mirror
          label="السابق"
          size="sm"
          variant="outline"
          disabled={page <= 1}
          onClick={() => onPage?.(page - 1)}
        />
        <span className="ef-num text-ink-700">
          {page} / {pageCount}
        </span>
        <IconButton
          icon="chevron-left"
          mirror
          label="التالي"
          size="sm"
          variant="outline"
          disabled={page >= pageCount}
          onClick={() => onPage?.(page + 1)}
        />
      </div>
    </div>
  );
}
