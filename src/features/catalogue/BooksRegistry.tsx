import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge, Button, Checkbox, SearchInput, formatNumber, type ActionItem, type Column } from '../../ds';
import { PagedList } from '../../shared/react/PagedList';
import { useDebouncedValue } from '../../shared/react/useDebouncedValue';
import { useBooksQuery } from './catalogue.api';
import { BookFormDialog } from './BookFormDialog';
import type { Book } from './catalogue.model';

type ToastState = { tone: 'success' | 'danger'; message: string };

/** The institute-wide book registry — what a كتاب *is*, and the only place its
 *  record is edited.
 *
 *  Which level and term prescribes it is a different question, answered by the
 *  المقررات tab: a متن is one record for the whole institute, and the same book is
 *  routinely prescribed at more than one level. Giving each level its own copy
 *  would fight `books UNIQUE(title_ar, author_ar)` and split a correction across
 *  copies, so the *prescription* is what varies, not the book. */
export function BooksRegistry({ onToast }: { onToast: (toast: ToastState) => void }) {
  const { t } = useTranslation();
  const [term, setTerm] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<Book | null | undefined>(undefined); // undefined = closed
  const search = useDebouncedValue(term.trim(), 300);
  const query = useBooksQuery({ page, search, includeInactive });

  const columns: Column<Book>[] = [
    { key: 'title', header: t('catalogue.books.titleColumn'), render: (b) => b.titleAr },
    { key: 'author', header: t('catalogue.books.authorColumn'), render: (b) => b.authorAr ?? <span className="text-ink-400">—</span> },
    { key: 'notes', header: t('catalogue.books.notesColumn'), render: (b) => b.notes ?? <span className="text-ink-400">—</span> },
    {
      key: 'status',
      header: t('catalogue.statusColumn'),
      render: (b) => (
        <Badge tone={b.isActive ? 'success' : 'neutral'}>
          {t(b.isActive ? 'catalogue.status.active' : 'catalogue.status.inactive')}
        </Badge>
      ),
    },
  ];

  const rowActions = (b: Book): ActionItem[] => [
    { key: 'edit', label: t('catalogue.edit'), icon: 'pencil', onSelect: () => setForm(b) },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={term}
          onChange={(e) => { setTerm(e.target.value); setPage(1); }}
          aria-label={t('catalogue.books.search')}
          placeholder={t('catalogue.books.search')}
        />
        <Checkbox
          label={t('catalogue.includeInactive')}
          checked={includeInactive}
          onChange={(e) => { setIncludeInactive(e.target.checked); setPage(1); }}
        />
        <Button className="ms-auto" icon="plus" onClick={() => setForm(null)}>
          {t('catalogue.books.create')}
        </Button>
      </div>

      <PagedList
        data={query.data}
        isLoading={query.isLoading}
        isError={query.isError}
        isFetching={query.isFetching}
        columns={columns}
        getRowKey={(b) => b.id}
        errorTitle={t('catalogue.error')}
        page={page}
        onPage={setPage}
        onRowClick={(b) => setForm(b)}
        rowActions={rowActions}
        empty={<p className="py-8 text-center text-sm text-ink-500">{t('catalogue.books.empty')}</p>}
      />

      {query.data ? (
        <p className="m-0 text-xs text-ink-500">
          {t('catalogue.books.registryHint', { count: formatNumber(query.data.total) })}
        </p>
      ) : null}

      {form !== undefined ? (
        <BookFormDialog
          book={form}
          onClose={() => setForm(undefined)}
          onSaved={(message) => { setForm(undefined); onToast({ tone: 'success', message }); }}
        />
      ) : null}
    </div>
  );
}
