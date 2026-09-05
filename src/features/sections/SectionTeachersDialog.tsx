import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Dialog,
  EmptyState,
  Field,
  IconButton,
  Select,
  type SelectOption,
} from '../../ds';
import { useTeacherOptionsQuery } from '../users';
import { useAssignTeacherMutation, useUnassignTeacherMutation } from './sections.api';
import type { Section } from './section.model';

/** Assign and unassign a section's teachers. `section` is read live from the
 *  list by the parent, so each assign/unassign — which invalidates the section
 *  list — flows back in as fresh props; the dialog keeps no roster state. */
export function SectionTeachersDialog({
  section,
  onClose,
}: {
  section: Section;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const teachers = useTeacherOptionsQuery();
  const [assign, assignState] = useAssignTeacherMutation();
  const [unassign, unassignState] = useUnassignTeacherMutation();

  const [userId, setUserId] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const assignedIds = new Set(section.teachers.map((teacher) => teacher.userId));
  const options: SelectOption[] = (teachers.data ?? [])
    .filter((teacher) => !assignedIds.has(teacher.id))
    .map((teacher) => ({ value: teacher.id, label: teacher.fullName }));

  const busy = assignState.isLoading || unassignState.isLoading;

  async function add() {
    if (userId === '' || busy) return;
    setError(null);
    try {
      await assign({ sectionId: section.id, userId, isPrimary }).unwrap();
      setUserId('');
      setIsPrimary(false);
    } catch (cause) {
      setError((cause as { detail?: string })?.detail ?? t('sections.teachers.error'));
    }
  }

  async function remove(teacherId: string) {
    setError(null);
    try {
      await unassign({ sectionId: section.id, userId: teacherId }).unwrap();
    } catch (cause) {
      setError((cause as { detail?: string })?.detail ?? t('sections.teachers.error'));
    }
  }

  return (
    <Dialog
      title={t('sections.teachers.title', { name: section.name })}
      onClose={onClose}
      width={520}
      footer={
        <Button variant="ghost" onClick={onClose}>
          {t('sections.teachers.done')}
        </Button>
      }
    >
      <div className="grid gap-4">
        {error ? <Alert tone="danger" title={error} /> : null}

        {section.teachers.length === 0 ? (
          <EmptyState icon="user" title={t('sections.teachers.empty')} />
        ) : (
          <ul className="m-0 grid list-none gap-2 p-0">
            {section.teachers.map((teacher) => (
              <li
                key={teacher.userId}
                className="flex items-center justify-between gap-3 rounded-md border border-subtle bg-surface px-3 py-2"
              >
                <span className="flex items-center gap-2 text-sm text-ink-900">
                  {teacher.fullName}
                  {teacher.isPrimary ? <Badge tone="brand">{t('sections.teachers.primary')}</Badge> : null}
                </span>
                <IconButton
                  icon="trash"
                  label={t('sections.teachers.remove')}
                  size="sm"
                  disabled={busy}
                  onClick={() => remove(teacher.userId)}
                />
              </li>
            ))}
          </ul>
        )}

        <div className="grid gap-3 border-t border-subtle pt-4">
          <Field label={t('sections.teachers.add')}>
            <Select
              options={options}
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder={t('sections.teachers.addPlaceholder')}
              disabled={options.length === 0}
            />
          </Field>
          <Checkbox
            label={t('sections.teachers.makePrimary')}
            checked={isPrimary}
            onChange={(e) => setIsPrimary(e.target.checked)}
          />
          <div>
            <Button icon="plus" onClick={add} disabled={userId === '' || busy} loading={assignState.isLoading}>
              {t('sections.teachers.addButton')}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
