import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Field,
  Select,
  type SelectOption,
} from '../../ds';
import { useAuth } from '../auth';
import { useListSectionsQuery, type Section } from '../sections';
import { useContainer } from '../../shared/di/DiProvider';
import { useCurrentAcademicYearQuery } from '../../shared/api/calendar';
import { useBranchesQuery } from '../../shared/api/reference';
import { HttpError } from '../../shared/http/http.errors';
import type { ImportJob } from './import.model';

const IMPORT_TYPES = ['roster', 'results'] as const;

/** Step one of an import: choose what the file targets, then upload it. Produces
 *  a preview job (nothing is written yet) and hands its id up. The upload is a
 *  multipart POST, so it goes straight through the transport rather than RTK
 *  Query. */
export function UploadForm({
  onCreated,
}: {
  onCreated: (jobId: string) => void;
}) {
  const { t } = useTranslation();
  const { http } = useContainer();
  const { user } = useAuth();

  const year = useCurrentAcademicYearQuery();
  const academicYearId = year.data?.id ?? null;

  // A branch-scoped head imports into their own branch; an institute-wide one
  // (no branch) must choose, so the branch list is only fetched then.
  const ownBranchId = user?.branchId ?? null;
  const branches = useBranchesQuery(undefined, { skip: ownBranchId != null });
  const [chosenBranchId, setChosenBranchId] = useState<number | null>(null);
  const branchId = ownBranchId ?? chosenBranchId;

  const sections = useListSectionsQuery(
    {
      academicYearId: academicYearId ?? 0,
      branchId: branchId ?? undefined,
      page: 1,
      pageSize: 100,
    },
    { skip: academicYearId == null || branchId == null },
  );

  const [importType, setImportType] =
    useState<(typeof IMPORT_TYPES)[number]>('roster');
  const [maleSectionId, setMaleSectionId] = useState('');
  const [femaleSectionId, setFemaleSectionId] = useState('');
  const [isHistorical, setIsHistorical] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const items = sections.data?.items ?? [];
  const maleOptions = toOptions(items.filter((s) => s.gender === 'male'));
  const femaleOptions = toOptions(items.filter((s) => s.gender === 'female'));

  const canSubmit =
    file != null &&
    academicYearId != null &&
    branchId != null &&
    (maleSectionId !== '' || femaleSectionId !== '') &&
    !submitting;

  async function submit() {
    if (
      !canSubmit ||
      file == null ||
      academicYearId == null ||
      branchId == null
    )
      return;
    setError(null);
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('importType', importType);
      form.append('branchId', String(branchId));
      form.append('academicYearId', String(academicYearId));
      form.append('isHistorical', String(isHistorical));
      if (maleSectionId) form.append('maleSectionId', maleSectionId);
      if (femaleSectionId) form.append('femaleSectionId', femaleSectionId);

      const job = await http.request<ImportJob>({
        method: 'POST',
        path: '/imports',
        body: form,
      });
      onCreated(job.id);
    } catch (cause) {
      setError(
        cause instanceof HttpError
          ? (cause.detail ?? t('import.uploadError'))
          : t('import.uploadError'),
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (year.data == null && !year.isLoading) {
    return <Alert tone="warning" title={t('import.noYear')} />;
  }

  return (
    // Centred, boxed column: the upload choices read as one focused task rather
    // than a form pinned to the start edge of a wide screen.
    <Card className="mx-auto max-w-xl">
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        {error ? <Alert tone="danger" title={error} /> : null}

        <Field label={t('import.type')}>
          <Select
            options={IMPORT_TYPES.map((value) => ({
              value,
              label: t(`import.types.${value}`),
            }))}
            value={importType}
            onChange={(e) =>
              setImportType(e.target.value as (typeof IMPORT_TYPES)[number])
            }
          />
        </Field>

        {ownBranchId == null ? (
          <Field label={t('import.branch')} required>
            <Select
              options={(branches.data?.items ?? []).map((b) => ({
                value: b.id,
                label: b.nameAr,
              }))}
              value={chosenBranchId ?? ''}
              onChange={(e) =>
                setChosenBranchId(
                  e.target.value ? Number(e.target.value) : null,
                )
              }
              placeholder={t('import.branchPlaceholder')}
            />
          </Field>
        ) : null}

        <Field label={t('import.maleSection')} hint={t('import.sectionHint')}>
          <Select
            options={maleOptions}
            value={maleSectionId}
            onChange={(e) => setMaleSectionId(e.target.value)}
            placeholder={t('import.sectionNone')}
            disabled={branchId == null}
          />
        </Field>

        <Field label={t('import.femaleSection')} hint={t('import.sectionHint')}>
          <Select
            options={femaleOptions}
            value={femaleSectionId}
            onChange={(e) => setFemaleSectionId(e.target.value)}
            placeholder={t('import.sectionNone')}
            disabled={branchId == null}
          />
        </Field>

        <Checkbox
          label={t('import.isHistorical')}
          checked={isHistorical}
          onChange={(e) => setIsHistorical(e.target.checked)}
        />

        <Field label={t('import.file')} required hint={t('import.fileHint')}>
          <input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-ink-700 file:me-3 file:rounded-md file:border file:border-default file:bg-canvas file:px-3 file:py-2 file:text-sm file:font-semibold"
          />
        </Field>

        <Button
          type="submit"
          icon="upload"
          disabled={!canSubmit}
          loading={submitting}
        >
          {t('import.upload')}
        </Button>
      </form>
    </Card>
  );
}

function toOptions(sections: Section[]): SelectOption[] {
  return sections.map((section) => ({
    value: section.id,
    label: section.name,
  }));
}
