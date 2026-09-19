import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  ConfirmDialog,
  DataTable,
  Field,
  SearchInput,
  Select,
  Tabs,
  Toast,
  formatNumber,
  type ActionItem,
  type Column,
  type SelectOption,
  type TabItem,
} from '../../ds';
import { useDebouncedValue } from '../../shared/react/useDebouncedValue';
import { PagedList, ListSkeleton } from '../../shared/react/PagedList';
import { useTabParam } from '../../shared/react/useTabParam';
import { useAcademicYearsQuery } from '../../shared/api/calendar';
import { useProgressionRulesQuery, type ProgressionRule } from '../settings';
import { CurriculumPage } from '../curriculum';
import { useLevelsQuery, useRemoveSubjectMutation, useSubjectsQuery } from './catalogue.api';
import { LevelEditDialog } from './LevelEditDialog';
import { SubjectFormDialog } from './SubjectFormDialog';
import { BooksRegistry } from './BooksRegistry';
import { ProgressionRuleDialog } from './ProgressionRuleDialog';
import { useCatalogueScope, type CatalogueScope } from './useCatalogueScope';
import type { Level, LevelFlags, Subject } from './catalogue.model';

const TAB_KEYS = ['curriculum', 'books', 'subjects', 'levels'] as const;
type TabKey = (typeof TAB_KEYS)[number];
type ToastState = { tone: 'success' | 'danger'; message: string };
const LEVEL_FLAGS: (keyof LevelFlags)[] = ['isOptional', 'isTerminal', 'allowsCarry', 'grantsCertificate', 'requiresCleanEntry'];
const TERMS = [1, 2];

/** The institute's study plan (head-teacher only, gated).
 *
 *  Organised as the plan first and the registries behind it, rather than as four
 *  peer lookup tables: an institute reads its الخطة الدراسية as «this level, this
 *  term, these مقررات and their كتب», so that is the front door and the شرح of
 *  what a subject or a book *is* sits one tab further in.
 *
 *  Every tab is read against one shared scope — العام · المستوى · الفصل — held in
 *  the URL (`useCatalogueScope`). Before that each tab scoped itself differently,
 *  which is why "the books of level 2, term 1" was not a question this screen
 *  could answer. The registries stay institute-wide, because a subject and a book
 *  belong to the institute and only their *prescription* belongs to a level. */
export function CataloguePage() {
  const { t } = useTranslation();
  const [tab, setTab] = useTabParam<TabKey>(TAB_KEYS, 'curriculum');
  const [toast, setToast] = useState<ToastState | null>(null);

  const years = useAcademicYearsQuery();
  const levels = useLevelsQuery();
  const sortedLevels = [...(levels.data ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
  const [scope, setScope] = useCatalogueScope({
    // Newest year and the first rung of the ladder, until the user chooses.
    yearId: years.data?.[0]?.id ?? null,
    levelId: sortedLevels[0]?.id ?? null,
  });

  const tabs: TabItem[] = TAB_KEYS.map((key) => ({ key, label: t(`catalogue.tabs.${key}`) }));

  return (
    <section className="space-y-4">
      {/* The registries are institute-wide, so offering them a المستوى/الفصل
          choice that changes nothing on screen is a lie about their scope. المواد
          needs no scope at all; المستويات is read per year only. */}
      {tab === 'books' || tab === 'subjects' ? null : (
        <ScopeBar
          scope={scope}
          levels={sortedLevels}
          fields={tab === 'levels' ? 'year' : 'all'}
          yearOptions={(years.data ?? []).map((year) => ({
            value: year.id,
            label: t('catalogue.scope.yearLabel', { n: formatNumber(year.hijriYear) }),
          }))}
          onChange={setScope}
        />
      )}

      <Tabs items={tabs} active={tab} onSelect={(key) => setTab(key as TabKey)} />

      {tab === 'curriculum' ? <CurriculumPage scope={scope} /> : null}
      {/* Titled, because the tab no longer carries a scope bar and the heading is
          what says the registry is the whole institute's, not this level's. The
          prescribed-books list that used to sit above it is the المقررات tab. */}
      {tab === 'books' ? (
        <section className="space-y-3">
          <h2 className="m-0 text-base font-bold text-ink-900">{t('catalogue.books.registryTitle')}</h2>
          <BooksRegistry onToast={setToast} />
        </section>
      ) : null}
      {tab === 'subjects' ? <SubjectsTab onToast={setToast} /> : null}
      {tab === 'levels' ? <LevelsTab yearId={scope.yearId} onToast={setToast} /> : null}

      {toast ? (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <Toast tone={toast.tone} message={toast.message} onDismiss={() => setToast(null)} />
        </div>
      ) : null}
    </section>
  );
}

/** The context the tab below is read against — all three pickers for the plan,
 *  the year alone for the levels' rules, which are a per-year record. */
function ScopeBar({
  scope,
  levels,
  fields,
  yearOptions,
  onChange,
}: {
  scope: CatalogueScope;
  levels: Level[];
  fields: 'all' | 'year';
  yearOptions: SelectOption[];
  onChange: (patch: Partial<CatalogueScope>) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-subtle bg-surface p-3">
      <Field label={t('catalogue.scope.year')} className="w-44">
        <Select
          options={yearOptions}
          value={scope.yearId ?? ''}
          onChange={(e) => onChange({ yearId: Number(e.target.value) })}
          aria-label={t('catalogue.scope.year')}
        />
      </Field>
      {fields === 'all' ? (
        <>
          <Field label={t('catalogue.scope.level')} className="w-52">
            <Select
              options={levels.map((level) => ({ value: level.id, label: level.nameAr }))}
              value={scope.levelId ?? ''}
              onChange={(e) => onChange({ levelId: Number(e.target.value) })}
              aria-label={t('catalogue.scope.level')}
            />
          </Field>
          <Field label={t('catalogue.scope.term')} className="w-40">
            <Select
              options={TERMS.map((n) => ({ value: n, label: t('catalogue.scope.termLabel', { n: formatNumber(n) }) }))}
              value={scope.termNumber}
              onChange={(e) => onChange({ termNumber: Number(e.target.value) })}
              aria-label={t('catalogue.scope.term')}
            />
          </Field>
        </>
      ) : null}
    </div>
  );
}

/** A level's rung on the ladder and the rules that decide who leaves it.
 *
 *  The two belong together: `allowsCarry` on the level and `maxCarriedSubjects`
 *  on the year's rule are read by the same decision (§4.3), and splitting them
 *  across two screens is why the rules ended up with no screen at all. */
function LevelsTab({ yearId, onToast }: { yearId: number | null; onToast: (toast: ToastState) => void }) {
  const { t } = useTranslation();
  const query = useLevelsQuery();
  const rules = useProgressionRulesQuery(yearId ?? 0, { skip: yearId == null });
  const [editingFlags, setEditingFlags] = useState<Level | null>(null);
  const [editingRule, setEditingRule] = useState<{ levelId: number | null; name: string } | null>(null);

  const ruleFor = (levelId: number | null) =>
    (rules.data ?? []).find((rule) => rule.levelId === levelId) ?? null;
  const fallback = ruleFor(null);

  const columns: Column<Level>[] = [
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
    {
      key: 'rules',
      header: t('catalogue.rules.column'),
      render: (l) => <RuleSummary rule={ruleFor(l.id)} />,
    },
  ];

  if (query.isLoading && !query.data) return <ListSkeleton />;
  if (query.isError || !query.data) return <Alert tone="danger" title={t('catalogue.error')} />;

  return (
    <div className="space-y-4">
      {/* One named row for the `level_id IS NULL` rule. Named, and singular, so it
          reads as a thing that exists once — the unique index does not stop a
          second one, because Postgres treats NULLs as distinct. */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="m-0 text-sm font-bold text-ink-900">{t('catalogue.rules.yearWide')}</h3>
            <p className="m-0 mt-1 text-xs text-ink-500">{t('catalogue.rules.yearWideHint')}</p>
          </div>
          <div className="flex items-center gap-3">
            <RuleSummary rule={fallback} />
            <Button
              size="sm"
              variant="secondary"
              icon="pencil"
              disabled={yearId == null}
              onClick={() => setEditingRule({ levelId: null, name: t('catalogue.rules.yearWide') })}
            >
              {t('catalogue.edit')}
            </Button>
          </div>
        </div>
      </Card>

      <DataTable
        columns={columns}
        rows={query.data}
        getRowKey={(l) => l.id}
        onRowClick={(l) => setEditingFlags(l)}
        rowActions={(l) => [
          { key: 'flags', label: t('catalogue.levels.editFlags'), icon: 'pencil', onSelect: () => setEditingFlags(l) },
          { key: 'rules', label: t('catalogue.rules.edit'), icon: 'settings', onSelect: () => setEditingRule({ levelId: l.id, name: l.nameAr }) },
        ]}
      />

      {editingFlags ? (
        <LevelEditDialog
          level={editingFlags}
          onClose={() => setEditingFlags(null)}
          onSaved={(message) => { setEditingFlags(null); onToast({ tone: 'success', message }); }}
        />
      ) : null}

      {editingRule && yearId != null ? (
        <ProgressionRuleDialog
          yearId={yearId}
          levelId={editingRule.levelId}
          levelName={editingRule.name}
          rule={ruleFor(editingRule.levelId)}
          onClose={() => setEditingRule(null)}
          onSaved={(message) => { setEditingRule(null); onToast({ tone: 'success', message }); }}
        />
      ) : null}
    </div>
  );
}

/** «لم تُضبط» is the state that matters: a level with no rule and no year-wide
 *  fallback blocks every one of its students in the promotion run. */
function RuleSummary({ rule }: { rule: ProgressionRule | null }) {
  const { t } = useTranslation();
  if (rule == null) return <Badge tone="warning">{t('catalogue.rules.notSet')}</Badge>;

  return (
    <span className="flex flex-wrap items-center gap-1 text-xs text-ink-600">
      <span className="ef-num">
        {t('catalogue.rules.maxCarriedShort', { count: formatNumber(rule.maxCarriedSubjects) })}
      </span>
      {rule.makeupRoundEnabled ? <Badge tone="neutral">{t('catalogue.rules.makeupShort')}</Badge> : null}
      {rule.mandatoryCanBeCarried ? <Badge tone="warning">{t('catalogue.rules.mandatoryShort')}</Badge> : null}
    </span>
  );
}

function SubjectsTab({ onToast }: { onToast: (toast: ToastState) => void }) {
  const { t } = useTranslation();
  const [term, setTerm] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [page, setPage] = useState(1);
  /* undefined = closed · null = creating · id = editing. The *id* rather than the
     row, so that adding or removing an alias — which invalidates the list — hands
     the dialog the refreshed subject instead of the snapshot it opened with. */
  const [editingId, setEditingId] = useState<number | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<Subject | null>(null);
  const [removeSubject] = useRemoveSubjectMutation();
  const search = useDebouncedValue(term.trim(), 300);
  const query = useSubjectsQuery({ page, search, includeInactive });
  const editing =
    typeof editingId === 'number'
      ? (query.data?.items.find((subject) => subject.id === editingId) ?? null)
      : null;

  const columns: Column<Subject>[] = [
    { key: 'name', header: t('catalogue.subjects.nameColumn'), render: (s) => (
      <span className="flex flex-col gap-0.5">
        <span className="font-semibold text-ink-900">{s.nameAr}</span>
        {/* The code is generated and means nothing to anyone; it is here only so
            a row can be quoted in a support conversation. */}
        <span className="ef-num text-xs text-ink-400">{s.code}</span>
      </span>
    ) },
    { key: 'aliases', header: t('catalogue.subjects.aliasesColumn'), numeric: true, render: (s) => <span className="ef-num">{formatNumber(s.aliases.length)}</span> },
    { key: 'status', header: t('catalogue.statusColumn'), render: (s) => <Badge tone={s.isActive ? 'success' : 'neutral'}>{t(s.isActive ? 'catalogue.status.active' : 'catalogue.status.inactive')}</Badge> },
  ];

  const rowActions = (s: Subject): ActionItem[] => [
    { key: 'edit', label: t('catalogue.edit'), icon: 'pencil', onSelect: () => setEditingId(s.id) },
    { key: 'delete', label: t('catalogue.subjects.delete'), icon: 'trash', tone: 'danger', onSelect: () => setDeleting(s) },
  ];

  /* Deletion is for the subject that was added by mistake. One that has been
     taught is refused by the API — curriculum rows, sessions and carried
     subjects all point at it — so the refusal is shown as the answer, with
     deactivation as what to do instead, rather than as a failed action. */
  async function confirmDelete() {
    if (!deleting) return;
    const target = deleting;
    setDeleting(null);
    try {
      await removeSubject(target.id).unwrap();
      onToast({ tone: 'success', message: t('catalogue.subjects.deleted', { name: target.nameAr }) });
    } catch (cause) {
      const conflict = (cause as { status?: number } | null)?.status === 409;
      onToast({
        tone: 'danger',
        message: t(conflict ? 'catalogue.subjects.deleteInUse' : 'catalogue.subjects.deleteError', {
          name: target.nameAr,
        }),
      });
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={term} onChange={(e) => { setTerm(e.target.value); setPage(1); }} aria-label={t('catalogue.subjects.search')} placeholder={t('catalogue.subjects.search')} />
        <Checkbox label={t('catalogue.includeInactive')} checked={includeInactive} onChange={(e) => { setIncludeInactive(e.target.checked); setPage(1); }} />
        <Button className="ms-auto" icon="plus" onClick={() => setEditingId(null)}>{t('catalogue.subjects.create')}</Button>
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
        onRowClick={(s) => setEditingId(s.id)}
        rowActions={rowActions}
        empty={<EmptyHint text={t('catalogue.subjects.empty')} />}
      />
      {editingId !== undefined ? (
        <SubjectFormDialog
          subject={editing}
          onClose={() => setEditingId(undefined)}
          onSaved={(message) => { setEditingId(undefined); onToast({ tone: 'success', message }); }}
        />
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title={t('catalogue.subjects.deleteTitle')}
          consequence={t('catalogue.subjects.deleteConfirm', { name: deleting.nameAr })}
          confirmLabel={t('catalogue.subjects.delete')}
          cancelLabel={t('catalogue.cancel')}
          tone="danger"
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      ) : null}
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return <p className="py-8 text-center text-sm text-ink-500">{text}</p>;
}
