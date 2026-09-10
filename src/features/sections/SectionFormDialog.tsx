import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Dialog, Field, Input, Select } from '../../ds';
import { useUpdateSectionMutation } from './sections.api';
import type { Section } from './section.model';

const DELIVERY_MODES = ['onsite', 'online', 'hybrid'] as const;

/** Edits a class. Branch, year, level and gender are the class's identity — they
 *  are composite-FK targets that enrolments and teacher assignments point at,
 *  and a level holds exactly one class per gender (R1 × R3), so there is nothing
 *  to choose. Only the display name, delivery mode and capacity are editable.
 *
 *  There is no create mode: classes come into existence through
 *  `POST /sections/provision`, which derives them from the levels the institute
 *  teaches. */
export function SectionFormDialog({
  section,
  onClose,
  onSaved,
}: {
  section: Section;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const { t } = useTranslation();
  const [update, updateState] = useUpdateSectionMutation();

  const [name, setName] = useState(section.name);
  const [defaultMode, setDefaultMode] = useState(section.defaultMode);
  const [capacity, setCapacity] = useState(
    section.capacity != null ? String(section.capacity) : '',
  );
  const [error, setError] = useState<string | null>(null);

  const busy = updateState.isLoading;
  const canSubmit = name.trim() !== '' && !busy;

  async function submit() {
    if (!canSubmit) return;
    setError(null);
    try {
      await update({
        id: section.id,
        patch: {
          name: name.trim(),
          defaultMode,
          capacity: capacity.trim() === '' ? null : Number(capacity),
        },
      }).unwrap();
      onSaved(t('sections.form.saved'));
    } catch (cause) {
      setError((cause as { detail?: string })?.detail ?? t('sections.form.error'));
    }
  }

  return (
    <Dialog
      title={t('sections.form.editTitle')}
      onClose={onClose}
      width={560}
      footer={
        <>
          <Button
            variant="primary"
            icon="circle-check"
            onClick={submit}
            disabled={!canSubmit}
            loading={busy}
          >
            {t('sections.form.save')}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            {t('sections.form.cancel')}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        {error ? <Alert tone="danger" title={error} /> : null}

        <Field label={t('sections.form.name')} required>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label={t('sections.form.name')}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('sections.form.mode')}>
            <Select
              options={DELIVERY_MODES.map((value) => ({
                value,
                label: t(`sections.form.modes.${value}`),
              }))}
              value={defaultMode}
              onChange={(e) => setDefaultMode(e.target.value)}
            />
          </Field>
          <Field label={t('sections.form.capacity')} hint={t('sections.form.capacityHint')}>
            <Input
              type="number"
              min={1}
              max={500}
              numeric
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              aria-label={t('sections.form.capacity')}
            />
          </Field>
        </div>
      </div>
    </Dialog>
  );
}
