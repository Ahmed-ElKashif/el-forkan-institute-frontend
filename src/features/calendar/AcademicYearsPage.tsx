import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Badge,
  Button,
  Card,
  DatePicker,
  Dialog,
  Field,
  formatClassDate,
  formatNumber,
  IconButton,
  Input,
  Select,
  Toast,
  type BadgeProps,
} from '../../ds';
import { ListSkeleton } from '../../shared/react/PagedList';
import {
  useAcademicYearsQuery,
  useCreateAcademicYearMutation,
  useUpdateAcademicYearMutation,
  useUpdateTermMutation,
  type AcademicYear,
  type Term,
} from '../../shared/api/calendar';
import { useListSectionsQuery, useProvisionSectionsMutation } from '../sections';

type ToastState = { tone: 'success' | 'danger'; message: string };

const STATUS_TONE: Record<string, NonNullable<BadgeProps['tone']>> = {
  planned: 'neutral',
  active: 'success',
  closed: 'neutral',
};

/** The Hijri academic-year label, e.g. "١٤٤٧/١٤٤٨" — an academic year runs across
 *  two consecutive Hijri years, and `hijri_year` stores the starting one. */
function hijriRange(hijriYear: number): string {
  return `${formatNumber(hijriYear)}/${formatNumber(hijriYear + 1)}`;
}

/** Keep the create field to an academic-year range as the user types: digits and
 *  one slash, the slash auto-inserted once the starting year has four digits, and
 *  each year capped at four digits — so it fills in as "1447/1448". */
function sanitizeYearRange(raw: string): string {
  const cleaned = raw.replace(/[^\d/]/g, '');
  const [start = '', end = ''] = cleaned.split('/');
  const a = start.slice(0, 4);
  const b = end.slice(0, 4);
  if (cleaned.includes('/')) return `${a}/${b}`;
  return a.length === 4 ? `${a}/` : a;
}

/** Years & Terms (head-teacher): the standard academic-year setup surface. Create
 *  the upcoming year (with its terms), set exactly one year current, set up its
 *  classes for intake, edit term dates, and close finished years. This is where
 *  the year's classes are provisioned — the action that used to sit, out of
 *  place, on the Levels list. */
export function AcademicYearsPage() {
  const { t } = useTranslation();
  const years = useAcademicYearsQuery();
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  if (years.isLoading && !years.data) return <ListSkeleton />;
  if (years.isError || !years.data) return <Alert tone="danger" title={t('years.error')} />;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="m-0 text-sm text-ink-500">{t('years.caption')}</p>
        <Button size="sm" icon="plus" onClick={() => setCreating(true)}>
          {t('years.create')}
        </Button>
      </div>

      <div className="grid gap-4">
        {years.data.map((year) => (
          <YearCard key={year.id} year={year} onDone={setToast} />
        ))}
      </div>

      {creating ? (
        <CreateYearDialog
          onClose={() => setCreating(false)}
          onSaved={(message) => {
            setCreating(false);
            setToast({ tone: 'success', message });
          }}
        />
      ) : null}

      {toast ? (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <Toast tone={toast.tone} message={toast.message} onDismiss={() => setToast(null)} />
        </div>
      ) : null}
    </section>
  );
}

function YearCard({ year, onDone }: { year: AcademicYear; onDone: (toast: ToastState) => void }) {
  const { t } = useTranslation();
  const [update, updateState] = useUpdateAcademicYearMutation();
  const [provision, provisionState] = useProvisionSectionsMutation();
  const [editingTerm, setEditingTerm] = useState<Term | null>(null);

  // One light read per year to show whether its classes are set up yet.
  const sections = useListSectionsQuery({ academicYearId: year.id, page: 1, pageSize: 1 });
  const classCount = sections.data?.total;

  async function setStatus(status: string, message: string) {
    try {
      await update({ id: year.id, status }).unwrap();
      onDone({ tone: 'success', message });
    } catch {
      onDone({ tone: 'danger', message: t('years.statusError') });
    }
  }

  async function provisionYear() {
    try {
      const { created, total } = await provision({ academicYearId: year.id }).unwrap();
      onDone({
        tone: 'success',
        message: created === 0 ? t('years.provisionNone') : t('years.provisioned', { created: formatNumber(created), total: formatNumber(total) }),
      });
    } catch {
      onDone({ tone: 'danger', message: t('years.provisionError') });
    }
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="m-0 text-base font-bold text-ink-900">
          {t('years.title', { n: hijriRange(year.hijriYear) })}
        </h2>
        <Badge tone={STATUS_TONE[year.status] ?? 'neutral'}>{t(`years.status.${year.status}`, year.status)}</Badge>
        <span className="ef-num text-sm text-ink-500">
          {formatClassDate(year.startsOn)} – {formatClassDate(year.endsOn)}
        </span>
        <div className="ms-auto flex items-center gap-2">
          {year.status !== 'active' ? (
            <Button size="sm" variant="secondary" icon="circle-check" loading={updateState.isLoading} onClick={() => setStatus('active', t('years.setCurrentDone'))}>
              {t('years.setCurrent')}
            </Button>
          ) : null}
          {year.status !== 'closed' ? (
            <Button size="sm" variant="ghost" onClick={() => setStatus('closed', t('years.closed'))}>
              {t('years.close')}
            </Button>
          ) : null}
        </div>
      </div>

      {/* Classes setup — the provisioning step, in its proper home. */}
      <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-subtle pt-3">
        <span className="text-sm text-ink-600">
          {classCount === undefined
            ? '—'
            : classCount === 0
              ? t('years.classes.none')
              : t('years.classes.count', { count: formatNumber(classCount) })}
        </span>
        {classCount === 0 ? (
          <Button size="sm" icon="book-open" loading={provisionState.isLoading} onClick={provisionYear}>
            {t('years.provision')}
          </Button>
        ) : null}
      </div>

      {/* Terms — the other half of "Years & Terms". */}
      {year.terms.length > 0 ? (
        <ul className="m-0 mt-3 grid list-none gap-2 p-0">
          {year.terms.map((term) => (
            <li key={term.id} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold text-ink-800">{t('years.terms.term', { n: formatNumber(term.termNumber) })}</span>
              <span className="ef-num text-ink-500">{formatClassDate(term.startsOn)} – {formatClassDate(term.endsOn)}</span>
              <Badge tone={STATUS_TONE[term.status] ?? 'neutral'}>{t(`years.status.${term.status}`, term.status)}</Badge>
              <IconButton icon="settings" variant="ghost" size="sm" label={t('years.terms.edit')} onClick={() => setEditingTerm(term)} />
            </li>
          ))}
        </ul>
      ) : null}

      {editingTerm ? (
        <TermDialog term={editingTerm} onClose={() => setEditingTerm(null)} onSaved={(message) => { setEditingTerm(null); onDone({ tone: 'success', message }); }} />
      ) : null}
    </Card>
  );
}

function CreateYearDialog({ onClose, onSaved }: { onClose: () => void; onSaved: (message: string) => void }) {
  const { t } = useTranslation();
  const [create, createState] = useCreateAcademicYearMutation();
  const [range, setRange] = useState('');
  const [error, setError] = useState<string | null>(null);

  // The field holds the "1447/1448" span; the API stores the starting year, and
  // the two must be consecutive Hijri years in range.
  const match = /^(\d{4})\/(\d{4})$/.exec(range);
  const start = match ? Number(match[1]) : NaN;
  const end = match ? Number(match[2]) : NaN;
  const valid = match != null && start >= 1400 && start <= 1500 && end === start + 1;
  // Only complain once a full pair has been entered, not mid-typing.
  const rangeError = match != null && !valid ? t('years.rangeError') : undefined;

  async function submit() {
    if (!valid || createState.isLoading) return;
    setError(null);
    try {
      await create({ hijriYear: start }).unwrap();
      onSaved(t('years.created'));
    } catch (cause) {
      setError((cause as { detail?: string })?.detail ?? t('years.createError'));
    }
  }

  return (
    <Dialog
      title={t('years.createTitle')}
      onClose={onClose}
      width={440}
      footer={
        <>
          <Button variant="primary" icon="circle-check" onClick={submit} disabled={!valid} loading={createState.isLoading}>
            {t('years.save')}
          </Button>
          <Button variant="secondary" onClick={onClose}>{t('years.cancel')}</Button>
        </>
      }
    >
      <div className="grid gap-4">
        {error ? <Alert tone="danger" title={error} /> : null}
        <Field label={t('years.hijriYear')} hint={t('years.hijriYearHint')} error={rangeError}>
          <Input
            value={range}
            onChange={(e) => setRange(sanitizeYearRange(e.target.value))}
            invalid={rangeError != null}
            inputMode="numeric"
            numeric
            maxLength={9}
            placeholder="1447/1448"
            aria-label={t('years.hijriYear')}
          />
        </Field>
      </div>
    </Dialog>
  );
}

function TermDialog({ term, onClose, onSaved }: { term: Term; onClose: () => void; onSaved: (message: string) => void }) {
  const { t } = useTranslation();
  const [update, updateState] = useUpdateTermMutation();
  const [startsOn, setStartsOn] = useState(term.startsOn.slice(0, 10));
  const [endsOn, setEndsOn] = useState(term.endsOn.slice(0, 10));
  const [examStartsOn, setExamStartsOn] = useState(term.examStartsOn?.slice(0, 10) ?? '');
  const [examEndsOn, setExamEndsOn] = useState(term.examEndsOn?.slice(0, 10) ?? '');
  const [status, setStatus] = useState(term.status);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (updateState.isLoading) return;
    setError(null);
    try {
      await update({
        id: term.id,
        startsOn,
        endsOn,
        examStartsOn: examStartsOn === '' ? null : examStartsOn,
        examEndsOn: examEndsOn === '' ? null : examEndsOn,
        status,
      }).unwrap();
      onSaved(t('years.terms.saved'));
    } catch (cause) {
      setError((cause as { detail?: string })?.detail ?? t('years.terms.error'));
    }
  }

  return (
    <Dialog
      title={t('years.terms.editTitle', { n: formatNumber(term.termNumber) })}
      onClose={onClose}
      width={520}
      footer={
        <>
          <Button variant="primary" icon="circle-check" onClick={submit} loading={updateState.isLoading}>{t('years.save')}</Button>
          <Button variant="secondary" onClick={onClose}>{t('years.cancel')}</Button>
        </>
      }
    >
      <div className="grid gap-4">
        {error ? <Alert tone="danger" title={error} /> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('years.terms.startsOn')}>
            <DatePicker value={startsOn} onChange={setStartsOn} aria-label={t('years.terms.startsOn')} />
          </Field>
          <Field label={t('years.terms.endsOn')}>
            <DatePicker value={endsOn} onChange={setEndsOn} aria-label={t('years.terms.endsOn')} />
          </Field>
          <Field label={t('years.terms.examStartsOn')}>
            <DatePicker value={examStartsOn} onChange={setExamStartsOn} aria-label={t('years.terms.examStartsOn')} />
          </Field>
          <Field label={t('years.terms.examEndsOn')}>
            <DatePicker value={examEndsOn} onChange={setExamEndsOn} aria-label={t('years.terms.examEndsOn')} />
          </Field>
        </div>
        <Field label={t('years.terms.status')}>
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={['planned', 'active', 'closed'].map((value) => ({ value, label: t(`years.status.${value}`) }))}
          />
        </Field>
      </div>
    </Dialog>
  );
}
