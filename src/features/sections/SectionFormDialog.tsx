import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Button,
  Dialog,
  Field,
  Input,
  Select,
  type SelectOption,
} from '../../ds';
import { useAuth } from '../auth';
import { useLevelsQuery } from '../catalogue';
import { useBranchesQuery } from '../../shared/api/reference';
import { useCreateSectionMutation, useUpdateSectionMutation } from './sections.api';
import type { Section } from './section.model';

const GENDERS = ['male', 'female'] as const;
const DELIVERY_MODES = ['onsite', 'online', 'hybrid'] as const;

/** Create or edit a section. Level, gender and branch are the section's identity
 *  (composite-FK targets) and are fixed after creation; only name, delivery mode
 *  and capacity stay editable. */
export function SectionFormDialog({
  section,
  academicYearId,
  onClose,
  onSaved,
}: {
  section: Section | null; // null = create
  academicYearId: number;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isEdit = section != null;
  const levels = useLevelsQuery();
  // A branch-bound head creates in their own branch; an institute-wide one picks.
  const ownBranchId = user?.branchId ?? null;
  const branches = useBranchesQuery(undefined, { skip: ownBranchId != null || isEdit });
  const [create, createState] = useCreateSectionMutation();
  const [update, updateState] = useUpdateSectionMutation();

  const [name, setName] = useState(section?.name ?? '');
  const [levelId, setLevelId] = useState<number | null>(section?.levelId ?? null);
  const [gender, setGender] = useState<string>(section?.gender ?? 'male');
  const [branchId, setBranchId] = useState<number | null>(ownBranchId);
  const [defaultMode, setDefaultMode] = useState(section?.defaultMode ?? 'onsite');
  const [capacity, setCapacity] = useState(section?.capacity != null ? String(section.capacity) : '');
  const [error, setError] = useState<string | null>(null);

  const busy = createState.isLoading || updateState.isLoading;
  const resolvedBranchId = ownBranchId ?? branchId;
  const canSubmit =
    name.trim() !== '' && (isEdit || (levelId != null && resolvedBranchId != null)) && !busy;

  const capacityValue = capacity.trim() === '' ? null : Number(capacity);

  async function submit() {
    if (!canSubmit) return;
    setError(null);
    try {
      if (isEdit) {
        await update({
          id: section.id,
          patch: { name: name.trim(), defaultMode, capacity: capacityValue },
        }).unwrap();
      } else {
        await create({
          branchId: resolvedBranchId as number,
          academicYearId,
          levelId: levelId as number,
          gender: gender as 'male' | 'female',
          name: name.trim(),
          defaultMode,
          capacity: capacityValue,
        }).unwrap();
      }
      onSaved(t(isEdit ? 'sections.form.saved' : 'sections.form.created'));
    } catch (cause) {
      setError((cause as { detail?: string })?.detail ?? t('sections.form.error'));
    }
  }

  const levelOptions: SelectOption[] = [...(levels.data ?? [])]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((level) => ({ value: level.id, label: level.nameAr }));
  const branchOptions: SelectOption[] = (branches.data?.items ?? []).map((b) => ({ value: b.id, label: b.nameAr }));

  return (
    <Dialog
      title={t(isEdit ? 'sections.form.editTitle' : 'sections.form.createTitle')}
      onClose={onClose}
      width={560}
      footer={
        <>
          <Button variant="primary" icon="circle-check" onClick={submit} disabled={!canSubmit} loading={busy}>
            {t('sections.form.save')}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            {t('sections.form.cancel')}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        {error ? <Alert tone="danger" title={error} /> : null}

        <Field label={t('sections.form.name')} required>
          <Input value={name} onChange={(e) => setName(e.target.value)} aria-label={t('sections.form.name')} />
        </Field>

        {!isEdit ? (
          <>
            {ownBranchId == null ? (
              <Field label={t('sections.form.branch')} required>
                <Select
                  options={branchOptions}
                  value={branchId ?? ''}
                  onChange={(e) => setBranchId(e.target.value ? Number(e.target.value) : null)}
                  placeholder={t('sections.form.branchPlaceholder')}
                />
              </Field>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('sections.form.level')} required>
                <Select
                  options={levelOptions}
                  value={levelId ?? ''}
                  onChange={(e) => setLevelId(e.target.value ? Number(e.target.value) : null)}
                  placeholder={t('sections.form.levelPlaceholder')}
                />
              </Field>
              <Field label={t('sections.form.gender')} required>
                <Select
                  options={GENDERS.map((value) => ({ value, label: t(`students.gender.${value}`) }))}
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                />
              </Field>
            </div>
          </>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('sections.form.mode')}>
            <Select
              options={DELIVERY_MODES.map((value) => ({ value, label: t(`sections.form.modes.${value}`) }))}
              value={defaultMode}
              onChange={(e) => setDefaultMode(e.target.value)}
            />
          </Field>
          <Field label={t('sections.form.capacity')} hint={t('sections.form.capacityHint')}>
            <Input type="number" min={1} max={500} numeric value={capacity} onChange={(e) => setCapacity(e.target.value)} aria-label={t('sections.form.capacity')} />
          </Field>
        </div>
      </div>
    </Dialog>
  );
}
