import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Button,
  Card,
  CommitBar,
  DataTable,
  EmptyState,
  Field,
  Icon,
  Select,
  Toast,
  formatNumber,
  type Column,
  type IconName,
  type SelectOption,
} from '../../ds';
import { useContainer } from '../../shared/di/DiProvider';
import { useCurrentAcademicYearQuery } from '../../shared/api/calendar';
import { useLevelsQuery } from '../catalogue';
import { toQueryString } from '../../shared/api/pagination';
import { saveBlob } from '../../shared/dom/download';
import { HttpError } from '../../shared/http/http.errors';
import { useLazyExportPreviewQuery, type ExportPreview, type ExportSheet } from './exports.api';

type ExportKind = 'roster' | 'results';

const KINDS: { kind: ExportKind; icon: IconName }[] = [
  { kind: 'roster', icon: 'users' },
  { kind: 'results', icon: 'file-spreadsheet' },
];

/** Export the current year's data to Excel. The counterpart to the import tab,
 *  and now the same shape as it (§6.3): pick an optional level, read the exact
 *  rows on screen, then confirm to download.
 *
 *  The preview is an ordinary RTK Query read. The file is not — a Blob does not
 *  belong in the query cache, so it is fetched through the http seam
 *  (`responseType: 'blob'`) and handed to the browser to save. */
export function ExportsPage() {
  const { t } = useTranslation();
  const { http } = useContainer();
  const year = useCurrentAcademicYearQuery();
  const levels = useLevelsQuery();

  const [levelId, setLevelId] = useState<number | undefined>(undefined);
  const [busy, setBusy] = useState<ExportKind | null>(null);
  const [toast, setToast] = useState<{ tone: 'success' | 'danger'; message: string } | null>(null);
  const [reviewing, setReviewing] = useState<{ kind: ExportKind; preview: ExportPreview } | null>(null);
  const [loadPreview, previewState] = useLazyExportPreviewQuery();

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

  async function review(kind: ExportKind) {
    if (year.data == null) return;
    setToast(null);
    try {
      const preview = await loadPreview({
        kind,
        academicYearId: year.data.id,
        levelId,
      }).unwrap();
      setReviewing({ kind, preview });
    } catch {
      setToast({ tone: 'danger', message: t('exports.previewError') });
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

      {reviewing ? (
        <PreviewResult
          preview={reviewing.preview}
          downloading={busy !== null}
          onBack={() => setReviewing(null)}
          onConfirm={() => download(reviewing.kind)}
        />
      ) : (
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
                {/* Preview leads: reading the rows before the file leaves is
                    the point (§6.3). Downloading directly stays available. */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    icon="file-text"
                    onClick={() => review(kind)}
                    loading={previewState.isFetching}
                    disabled={year.data == null}
                  >
                    {t('exports.preview')}
                  </Button>
                  <Button
                    variant="secondary"
                    icon="download"
                    onClick={() => download(kind)}
                    loading={busy === kind}
                    disabled={busy !== null || year.data == null}
                  >
                    {t('exports.download')}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
      )}

      {year.isError ? <Alert tone="danger" title={t('exports.error')} /> : null}
      {toast ? <Toast tone={toast.tone} message={toast.message} onDismiss={() => setToast(null)} /> : null}
    </section>
  );
}

/** The rows that are about to leave, one table per gender sheet (R3), behind the
 *  same commit rail the import preview and the promotion run use. */
function PreviewResult({
  preview,
  downloading,
  onBack,
  onConfirm,
}: {
  preview: ExportPreview;
  downloading: boolean;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const { t } = useTranslation();

  if (preview.rowCount === 0) {
    return (
      <div className="space-y-4">
        <Button variant="secondary" icon="chevron-right" iconMirror onClick={onBack}>
          {t('exports.back')}
        </Button>
        <EmptyState icon="file-spreadsheet" title={t('exports.previewEmpty')} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button variant="secondary" icon="chevron-right" iconMirror onClick={onBack}>
        {t('exports.back')}
      </Button>

      {preview.sheets.map((sheet) => (
        <SheetTable key={sheet.name} sheet={sheet} />
      ))}

      <CommitBar
        counts={[
          {
            label: t('exports.previewRows'),
            value: formatNumber(preview.rowCount),
            tone: 'create',
          },
        ]}
        note={t('exports.previewNote')}
        confirmLabel={t('exports.download')}
        disabled={downloading}
        onConfirm={onConfirm}
      />
    </div>
  );
}

function SheetTable({ sheet }: { sheet: ExportSheet }) {
  /* The sheet arrives as positional cells, exactly as the workbook writes them,
     so the columns are derived from its own headers rather than restated here —
     one place decides what an export contains, and it is the server. */
  const columns: Column<string[]>[] = sheet.headers.map((header, index) => ({
    key: String(index),
    header,
    render: (row) => row[index] ?? '',
  }));

  return (
    <section className="space-y-2">
      <h3 className="m-0 text-sm font-semibold text-ink-700">{sheet.name}</h3>
      {sheet.rows.length === 0 ? (
        <p className="m-0 text-sm text-ink-400">—</p>
      ) : (
        <DataTable
          density="compact"
          columns={columns}
          rows={sheet.rows}
          getRowKey={(_row, index) => String(index)}
        />
      )}
    </section>
  );
}
