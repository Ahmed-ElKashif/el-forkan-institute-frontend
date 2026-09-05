import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Button,
  Card,
  EmptyState,
  Field,
  Icon,
  Select,
  Toast,
  formatNumber,
  type IconName,
  type SelectOption,
} from '../../ds';
import { useContainer } from '../../shared/di/DiProvider';
import { useCurrentAcademicYearQuery } from '../../shared/api/calendar';
import { useLevelsQuery } from '../catalogue';
import { toQueryString } from '../../shared/api/pagination';
import { saveBlob } from '../../shared/dom/download';
import { HttpError } from '../../shared/http/http.errors';

type ExportKind = 'roster' | 'results';

const KINDS: { kind: ExportKind; icon: IconName }[] = [
  { kind: 'roster', icon: 'users' },
  { kind: 'results', icon: 'file-spreadsheet' },
];

/** Export the current year's data to Excel (head-teacher only). The counterpart
 *  to the import screen: pick an optional level, then download the roster or the
 *  results workbook. The file is fetched with the user's token through the http
 *  seam (`responseType: 'blob'`) and handed to the browser to save. */
export function ExportsPage() {
  const { t } = useTranslation();
  const { http } = useContainer();
  const year = useCurrentAcademicYearQuery();
  const levels = useLevelsQuery();

  const [levelId, setLevelId] = useState<number | undefined>(undefined);
  const [busy, setBusy] = useState<ExportKind | null>(null);
  const [toast, setToast] = useState<{ tone: 'success' | 'danger'; message: string } | null>(null);

  if (year.data == null && !year.isLoading) {
    return (
      <EmptyState
        icon="calendar-days"
        title={t('exports.noYear.title')}
        description={t('exports.noYear.description')}
      />
    );
  }

  async function download(kind: ExportKind) {
    if (year.data == null) return;
    setBusy(kind);
    setToast(null);
    try {
      const query = toQueryString({ academicYearId: year.data.id, levelId });
      const blob = await http.request<Blob>({
        method: 'GET',
        path: `/exports/${kind}?${query}`,
        responseType: 'blob',
      });
      const suffix = levelId != null ? `-${levelId}` : '';
      saveBlob(blob, `${kind}-${year.data.hijriYear}${suffix}.xlsx`);
      setToast({ tone: 'success', message: t('exports.done') });
    } catch (cause) {
      const detail = cause instanceof HttpError ? cause.detail : null;
      setToast({ tone: 'danger', message: detail ?? t('exports.error') });
    } finally {
      setBusy(null);
    }
  }

  const levelOptions: SelectOption[] = [
    { value: '', label: t('exports.allLevels') },
    ...[...(levels.data ?? [])]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((level) => ({ value: level.id, label: level.nameAr })),
  ];

  return (
    <section className="space-y-6">
      {year.data ? (
        <p className="m-0 text-sm text-ink-500">
          {t('exports.yearCaption', { year: formatNumber(year.data.hijriYear) })}
        </p>
      ) : null}

      <div className="max-w-xs">
        <Field label={t('exports.level')} hint={t('exports.levelHint')}>
          <Select
            options={levelOptions}
            value={levelId ?? ''}
            onChange={(e) => setLevelId(e.target.value ? Number(e.target.value) : undefined)}
          />
        </Field>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {KINDS.map(({ kind, icon }) => (
          <Card key={kind}>
            <div className="flex items-start gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-tint text-teal-700">
                <Icon name={icon} size={22} />
              </span>
              <div className="flex-1">
                <h3 className="m-0 text-base font-semibold text-ink-900">{t(`exports.${kind}.title`)}</h3>
                <p className="mt-1 mb-3 text-sm text-ink-500">{t(`exports.${kind}.description`)}</p>
                <Button
                  icon="download"
                  onClick={() => download(kind)}
                  loading={busy === kind}
                  disabled={busy !== null || year.data == null}
                >
                  {t('exports.download')}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {year.isError ? <Alert tone="danger" title={t('exports.error')} /> : null}
      {toast ? <Toast tone={toast.tone} message={toast.message} onDismiss={() => setToast(null)} /> : null}
    </section>
  );
}
