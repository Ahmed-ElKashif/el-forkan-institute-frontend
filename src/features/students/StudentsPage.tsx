import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Badge,
  DataTable,
  EmptyState,
  Pagination,
  SearchInput,
  Skeleton,
  formatNumber,
  type BadgeProps,
  type Column,
} from '../../ds';
import { DEFAULT_PAGE_SIZE, pageCount, type Page } from '../../shared/api/pagination';
import { useDebouncedValue } from '../../shared/react/useDebouncedValue';
import { useListStudentsQuery } from './students.api';
import type { Student } from './student.model';

const STATUS_TONE: Record<string, BadgeProps['tone']> = {
  active: 'success',
  graduated: 'brand',
  withdrawn: 'neutral',
  suspended: 'warning',
};

/** The students roster: search, paginate, read. The three F1 exit criteria live
 *  here — real Arabic names paginate and search without RTL breakage, and every
 *  number is Latin and tabular. Editing arrives in a later phase. */
export function StudentsPage() {
  const { t } = useTranslation();
  const [term, setTerm] = useState('');
  const [page, setPage] = useState(1);
  const search = useDebouncedValue(term.trim(), 300);

  /* RTK Query caches each (page, search) separately, so revisiting a page is
     instant and typing fires one request per pause (the term is debounced).
     A first-ever visit to a page shows the skeleton; `isFetching` dims the
     table on any refetch. */
  const query = useListStudentsQuery({ page, search });
  const roster = query.data;

  function onSearch(next: string) {
    setTerm(next);
    setPage(1);
  }

  const columns: Column<Student>[] = [
    { key: 'fullName', header: t('students.columns.name'), render: (s) => s.fullName },
    {
      key: 'studentCode',
      header: t('students.columns.code'),
      render: (s) => <span className="ef-num">{s.studentCode}</span>,
    },
    { key: 'gender', header: t('students.columns.gender'), render: (s) => t(`students.gender.${s.gender}`) },
    {
      key: 'phone',
      header: t('students.columns.phone'),
      render: (s) =>
        s.phone ? (
          // Isolate the number's direction: a leading "+" in an RTL row
          // otherwise jumps to the wrong end.
          <bdi className="ef-num">{s.phone}</bdi>
        ) : (
          <span className="text-ink-400">—</span>
        ),
    },
    {
      key: 'status',
      header: t('students.columns.status'),
      render: (s) => (
        <Badge tone={STATUS_TONE[s.status] ?? 'neutral'}>{t(`students.status.${s.status}`)}</Badge>
      ),
    },
  ];

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <SearchInput
          value={term}
          onChange={(e) => onSearch(e.target.value)}
          aria-label={t('students.searchPlaceholder')}
          placeholder={t('students.searchPlaceholder')}
        />
        {roster ? (
          <span className="whitespace-nowrap text-sm text-ink-500">
            {t('students.total', { total: formatNumber(roster.total) })}
          </span>
        ) : null}
      </div>

      <StudentsBody
        roster={roster}
        isLoading={query.isLoading}
        isError={query.isError}
        isFetching={query.isFetching}
        search={search}
        columns={columns}
        page={page}
        onPage={setPage}
      />
    </section>
  );
}

interface BodyProps {
  roster: Page<Student> | undefined;
  isLoading: boolean;
  isError: boolean;
  isFetching: boolean;
  search: string;
  columns: Column<Student>[];
  page: number;
  onPage: (page: number) => void;
}

function StudentsBody({ roster, isLoading, isError, isFetching, search, columns, page, onPage }: BodyProps) {
  const { t } = useTranslation();

  if (isLoading && !roster) return <TableSkeleton />;
  if (isError && !roster) return <Alert tone="danger" title={t('students.error')} />;
  if (!roster) return null;

  if (roster.items.length === 0) {
    return search ? (
      <EmptyState
        icon="search"
        title={t('students.emptySearch.title')}
        description={t('students.emptySearch.description', { term: search })}
      />
    ) : (
      <EmptyState icon="users" title={t('students.empty.title')} description={t('students.empty.description')} />
    );
  }

  return (
    <div className={isFetching ? 'opacity-60 transition-opacity' : undefined} aria-busy={isFetching}>
      <DataTable columns={columns} rows={roster.items} getRowKey={(s) => s.id} />
      <Pagination
        className="mt-4"
        page={page}
        pageCount={pageCount(roster.total, DEFAULT_PAGE_SIZE)}
        total={roster.total}
        onPage={onPage}
      />
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="rounded-lg border border-subtle bg-surface p-4">
      <Skeleton rows={8} height={20} />
    </div>
  );
}
