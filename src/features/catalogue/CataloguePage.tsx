import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  DataTable,
  SearchInput,
  Tabs,
  Toast,
  type ActionItem,
  type Column,
  type TabItem,
} from '../../ds';
import { useDebouncedValue } from '../../shared/react/useDebouncedValue';
import { PagedList, ListSkeleton } from '../../shared/react/PagedList';
import { useBooksQuery, useLevelsQuery, useSubjectsQuery } from './catalogue.api';
import { LevelEditDialog } from './LevelEditDialog';
import { SubjectFormDialog } from './SubjectFormDialog';
import { BookFormDialog } from './BookFormDialog';
import type { Book, Level, LevelFlags, Subject } from './catalogue.model';

type TabKey = 'levels' | 'subjects' | 'books';
type ToastState = { tone: 'success' | 'danger'; message: string };
const LEVEL_FLAGS: (keyof LevelFlags)[] = ['isOptional', 'isTerminal', 'allowsCarry', 'grantsCertificate', 'requiresCleanEntry'];

/** The catalogue (head-teacher only, gated): levels' progression flags, and the
 *  subject and book registries. One tabbed screen; each list is columns plus an
 *  empty state over `PagedList` (levels excepted — the API returns them whole). */
export function CataloguePage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<TabKey>('subjects');
  const [toast, setToast] = useState<ToastState | null>(null);

  const tabs: TabItem[] = [
    { key: 'levels', label: t('catalogue.tabs.levels') },
    { key: 'subjects', label: t('catalogue.tabs.subjects') },
    { key: 'books', label: t('catalogue.tabs.books') },
  ];

  return (
    <section className="space-y-4">
      <Tabs items={tabs} active={tab} onSelect={(key) => setTab(key as TabKey)} />
      {tab === 'levels' ? <LevelsTab onToast={setToast} /> : null}
      {tab === 'subjects' ? <SubjectsTab onToast={setToast} /> : null}
      {tab === 'books' ? <BooksTab onToast={setToast} /> : null}

      {toast ? (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <Toast tone={toast.tone} message={toast.message} onDismiss={() => setToast(null)} />
        </div>
      ) : null}
    </section>
  );
}

function LevelsTab({ onToast }: { onToast: (toast: ToastState) => void }) {
  const { t } = useTranslation();
  const query = useLevelsQuery();
  const [editing, setEditing] = useState<Level | null>(null);

  const columns: Column<Level>[] = [
    { key: 'code', header: t('catalogue.levels.code'), render: (l) => <span className="ef-num">{l.code}</span> },
    { key: 'name', header: t('catalogue.levels.name'), render: (l) => l.nameAr },
    {
      key: 'flags',
      header: t('catalogue.levels.flagsColumn'),
      render: (l) => (
        <div className="flex flex-wrap gap-1">
          {LEVEL_FLAGS.filter((flag) => l[flag]).map((flag) => (
            <Badge key={flag} tone="neutral">{t(`catalogue.levels.flags.${flag}`)}</Badge>
          ))}
        </div>
      ),
    },
  ];

  if (query.isLoading && !query.data) return <ListSkeleton />;
  if (query.isError || !query.data) return <Alert tone="danger" title={t('catalogue.error')} />;

  return (
    <>
      <DataTable
        columns={columns}
        rows={query.data}
        getRowKey={(l) => l.id}
        onRowClick={(l) => setEditing(l)}
        rowActions={(l) => [{ key: 'edit', label: t('catalogue.edit'), icon: 'pencil', onSelect: () => setEditing(l) }]}
      />
      {editing ? (
        <LevelEditDialog level={editing} onClose={() => setEditing(null)} onSaved={(message) => { setEditing(null); onToast({ tone: 'success', message }); }} />
      ) : null}
    </>
  );
}

function SubjectsTab({ onToast }: { onToast: (toast: ToastState) => void }) {
  const { t } = useTranslation();
  const [term, setTerm] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<Subject | null | undefined>(undefined); // undefined = closed
  const search = useDebouncedValue(term.trim(), 300);
  const query = useSubjectsQuery({ page, search, includeInactive });

  const columns: Column<Subject>[] = [
    { key: 'code', header: t('catalogue.subjects.codeColumn'), render: (s) => <span className="ef-num">{s.code}</span> },
    { key: 'name', header: t('catalogue.subjects.nameColumn'), render: (s) => s.nameAr },
    { key: 'aliases', header: t('catalogue.subjects.aliasesColumn'), numeric: true, render: (s) => <span className="ef-num">{s.aliases.length}</span> },
    { key: 'status', header: t('catalogue.statusColumn'), render: (s) => <Badge tone={s.isActive ? 'success' : 'neutral'}>{t(s.isActive ? 'catalogue.status.active' : 'catalogue.status.inactive')}</Badge> },
  ];

  const rowActions = (s: Subject): ActionItem[] => [
    { key: 'edit', label: t('catalogue.edit'), icon: 'pencil', onSelect: () => setForm(s) },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={term} onChange={(e) => { setTerm(e.target.value); setPage(1); }} aria-label={t('catalogue.subjects.search')} placeholder={t('catalogue.subjects.search')} />
        <Checkbox label={t('catalogue.includeInactive')} checked={includeInactive} onChange={(e) => { setIncludeInactive(e.target.checked); setPage(1); }} />
        <Button className="ms-auto" icon="plus" onClick={() => setForm(null)}>{t('catalogue.subjects.create')}</Button>
      </div>
      <PagedList
        data={query.data}
        isLoading={query.isLoading}
        isError={query.isError}
        isFetching={query.isFetching}
        columns={columns}
        getRowKey={(s) => s.id}
        errorTitle={t('catalogue.error')}
        page={page}
        onPage={setPage}
        onRowClick={(s) => setForm(s)}
        rowActions={rowActions}
        empty={<EmptyHint text={t('catalogue.subjects.empty')} />}
      />
      {form !== undefined ? (
        <SubjectFormDialog subject={form} onClose={() => setForm(undefined)} onSaved={(message) => { setForm(undefined); onToast({ tone: 'success', message }); }} />
      ) : null}
    </div>
  );
}

function BooksTab({ onToast }: { onToast: (toast: ToastState) => void }) {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<Book | null | undefined>(undefined);
  const query = useBooksQuery({ page });

  const columns: Column<Book>[] = [
    { key: 'title', header: t('catalogue.books.titleColumn'), render: (b) => b.titleAr },
    { key: 'author', header: t('catalogue.books.authorColumn'), render: (b) => b.authorAr ?? <span className="text-ink-400">—</span> },
    { key: 'status', header: t('catalogue.statusColumn'), render: (b) => <Badge tone={b.isActive ? 'success' : 'neutral'}>{t(b.isActive ? 'catalogue.status.active' : 'catalogue.status.inactive')}</Badge> },
  ];

  const rowActions = (b: Book): ActionItem[] => [
    { key: 'edit', label: t('catalogue.edit'), icon: 'pencil', onSelect: () => setForm(b) },
  ];

  return (
    <div className="space-y-3">
      <div className="flex">
        <Button className="ms-auto" icon="plus" onClick={() => setForm(null)}>{t('catalogue.books.create')}</Button>
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
        empty={<EmptyHint text={t('catalogue.books.empty')} />}
      />
      {form !== undefined ? (
        <BookFormDialog book={form} onClose={() => setForm(undefined)} onSaved={(message) => { setForm(undefined); onToast({ tone: 'success', message }); }} />
      ) : null}
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return <p className="py-8 text-center text-sm text-ink-500">{text}</p>;
}
