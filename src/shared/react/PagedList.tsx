import type { ReactNode } from 'react';
import {
  Alert,
  DataTable,
  Pagination,
  Skeleton,
  type ActionItem,
  type Column,
  type Density,
} from '../../ds';
import { DEFAULT_PAGE_SIZE, pageCount, type Page } from '../api/pagination';

export interface PagedListProps<T> {
  /** The RTK Query result fields a list screen branches on. */
  data: Page<T> | undefined;
  isLoading: boolean;
  isError: boolean;
  isFetching: boolean;
  columns: Column<T>[];
  getRowKey: (row: T) => string | number;
  /** Shown when the page is empty. The caller builds it so search/filter empty
   *  states can differ from the "nothing yet" one. */
  empty: ReactNode;
  errorTitle: string;
  page: number;
  onPage: (page: number) => void;
  density?: Density;
  /** Opens a row's detail; forwarded to the table (interactive cells excepted). */
  onRowClick?: (row: T) => void;
  /** Per-row actions — a trailing 3-dots menu, also opened on row right-click. */
  rowActions?: (row: T) => ActionItem[];
}

/** The loading → error → empty → table+pagination shell every list screen
 *  repeated. Extracted once so a new list screen is a set of columns and an
 *  empty state, not another copy of this branching.
 *
 *  The first load (no data yet) shows a skeleton; a refetch (`isFetching` with
 *  data present) dims the table instead of blanking it. */
export function PagedList<T>({
  data,
  isLoading,
  isError,
  isFetching,
  columns,
  getRowKey,
  empty,
  errorTitle,
  page,
  onPage,
  density,
  onRowClick,
  rowActions,
}: PagedListProps<T>) {
  if (isLoading && !data) return <ListSkeleton />;
  if (isError && !data) return <Alert tone="danger" title={errorTitle} />;
  if (!data) return null;
  if (data.items.length === 0) return <>{empty}</>;

  return (
    <div className={isFetching ? 'opacity-60 transition-opacity' : undefined} aria-busy={isFetching}>
      <DataTable
        density={density}
        columns={columns}
        rows={data.items}
        getRowKey={getRowKey}
        onRowClick={onRowClick}
        rowActions={rowActions}
      />
      <Pagination
        className="mt-4"
        page={page}
        pageCount={pageCount(data.total, DEFAULT_PAGE_SIZE)}
        total={data.total}
        onPage={onPage}
      />
    </div>
  );
}

/** The list's loading placeholder, exported for screens that reach a loading
 *  state before the list itself (a chained read still resolving). */
export function ListSkeleton() {
  return (
    <div className="rounded-lg border border-subtle bg-surface p-4">
      <Skeleton rows={8} height={20} />
    </div>
  );
}
