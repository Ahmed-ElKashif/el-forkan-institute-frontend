import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Dialog, Field, Input, Select, type SelectOption } from '../../ds';
import type { Subject } from '../catalogue';
import type { User } from '../users';
import { useCreateSlotMutation, useUpdateSlotMutation } from './timetable.api';
import { DELIVERY_MODES, WEEKDAY_ORDER, type DeliveryMode, type TimetableSlot } from './timetable.model';

export type SlotDialogTarget = { mode: 'create' } | { mode: 'edit'; slot: TimetableSlot };

interface Props {
  sectionId: string;
  target: SlotDialogTarget;
  subjects: Subject[];
  teachers: User[];
  onClose: () => void;
  onSaved: (message: string) => void;
}

/** Add or edit a timetable slot. Subject is fixed at creation (the API's update
 *  schema omits it). A teacher double-booking is refused server-side with a 409
 *  whose message names the clashing section and time — shown here in the Alert. */
export function SlotDialog({ sectionId, target, subjects, teachers, onClose, onSaved }: Props) {
  const { t } = useTranslation();
  const slot = target.mode === 'edit' ? target.slot : null;
  const [create, createState] = useCreateSlotMutation();
  const [update, updateState] = useUpdateSlotMutation();

  const [subjectId, setSubjectId] = useState<number | null>(slot?.subjectId ?? null);
  const [teacherId, setTeacherId] = useState<string | null>(slot?.teacherId ?? null);
  const [weekday, setWeekday] = useState(slot?.weekday ?? 5);
  const [slotOrder, setSlotOrder] = useState(String(slot?.slotOrder ?? 1));
  const [startsAt, setStartsAt] = useState(slot?.startsAt ?? '');
  const [endsAt, setEndsAt] = useState(slot?.endsAt ?? '');
  const [room, setRoom] = useState(slot?.room ?? '');
  const [mode, setMode] = useState<DeliveryMode>(slot?.mode ?? 'onsite');
  const [effectiveFrom, setEffectiveFrom] = useState(slot?.effectiveFrom ?? '');
  const [effectiveTo, setEffectiveTo] = useState(slot?.effectiveTo ?? '');
  const [error, setError] = useState<string | null>(null);

  const busy = createState.isLoading || updateState.isLoading;
  const endsBeforeStart = startsAt !== '' && endsAt !== '' && endsAt <= startsAt;
  const canSubmit = (target.mode === 'edit' || subjectId != null) && startsAt !== '' && endsAt !== '' && !endsBeforeStart && !busy;

  const subjectName = slot?.subjectNameAr ?? subjects.find((s) => s.id === subjectId)?.nameAr ?? '';
  const subjectOptions: SelectOption[] = subjects.map((s) => ({ value: s.id, label: s.nameAr }));
  const teacherOptions: SelectOption[] = teachers.map((teacher) => ({ value: teacher.id, label: teacher.fullName }));
  const weekdayOptions: SelectOption[] = WEEKDAY_ORDER.map((w) => ({ value: w, label: t(`timetable.weekdays.${w}`) }));
  const modeOptions: SelectOption[] = DELIVERY_MODES.map((m) => ({ value: m, label: t(`timetable.modes.${m}`) }));

  async function submit() {
    if (!canSubmit) return;
    setError(null);
    const shared = {
      teacherId,
      weekday,
      slotOrder: Number(slotOrder),
      startsAt,
      endsAt,
      room: room.trim() === '' ? null : room.trim(),
      mode,
      effectiveFrom: effectiveFrom === '' ? null : effectiveFrom,
      effectiveTo: effectiveTo === '' ? null : effectiveTo,
    };
    try {
      if (target.mode === 'edit') {
        await update({ id: target.slot.id, patch: shared }).unwrap();
      } else {
        await create({ sectionId, body: { subjectId: subjectId as number, ...shared } }).unwrap();
      }
      onSaved(t(target.mode === 'edit' ? 'timetable.slot.saved' : 'timetable.slot.created', { name: subjectName }));
    } catch (cause) {
      // A teacher double-booking comes back as 409 (the server names the clash
      // in an English `detail` we do not surface); every other failure is a
      // generic save error. baseQuery flattens the failure to `{ status, detail }`.
      const status = (cause as { status?: number | string }).status;
      setError(status === 409 ? t('timetable.slot.clash') : t('timetable.saveError'));
    }
  }

  return (
    <Dialog
      title={t(target.mode === 'edit' ? 'timetable.slot.editTitle' : 'timetable.slot.addTitle')}
      onClose={onClose}
      width={560}
      footer={
        <>
          <Button variant="primary" onClick={submit} disabled={!canSubmit} loading={busy}>{t('timetable.save')}</Button>
          <Button variant="secondary" onClick={onClose}>{t('timetable.cancel')}</Button>
        </>
      }
    >
      <div className="grid gap-4">
        {error ? <Alert tone="danger" title={error} /> : null}

        <Field label={t('timetable.slot.subject')} required={target.mode === 'create'}>
          {target.mode === 'edit' ? (
            <Input value={subjectName} readOnly aria-label={t('timetable.slot.subject')} />
          ) : (
            <Select options={subjectOptions} placeholder={t('timetable.slot.subjectPlaceholder')} value={subjectId ?? ''} onChange={(e) => setSubjectId(e.target.value === '' ? null : Number(e.target.value))} aria-label={t('timetable.slot.subject')} />
          )}
        </Field>

        <Field label={t('timetable.slot.teacher')} hint={t('timetable.slot.teacherHint')}>
          <Select options={teacherOptions} placeholder={t('timetable.slot.unassigned')} value={teacherId ?? ''} onChange={(e) => setTeacherId(e.target.value === '' ? null : e.target.value)} aria-label={t('timetable.slot.teacher')} />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t('timetable.slot.weekday')}>
            <Select options={weekdayOptions} value={weekday} onChange={(e) => setWeekday(Number(e.target.value))} aria-label={t('timetable.slot.weekday')} />
          </Field>
          <Field label={t('timetable.slot.order')} hint={t('timetable.slot.orderHint')}>
            <Input type="number" inputMode="numeric" className="ef-num" value={slotOrder} onChange={(e) => setSlotOrder(e.target.value)} aria-label={t('timetable.slot.order')} />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t('timetable.slot.startsAt')} required error={endsBeforeStart ? t('timetable.slot.endsBeforeStart') : undefined}>
            <Input type="time" className="ef-num" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} aria-label={t('timetable.slot.startsAt')} />
          </Field>
          <Field label={t('timetable.slot.endsAt')} required>
            <Input type="time" invalid={endsBeforeStart} className="ef-num" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} aria-label={t('timetable.slot.endsAt')} />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t('timetable.slot.room')}>
            <Input value={room} onChange={(e) => setRoom(e.target.value)} aria-label={t('timetable.slot.room')} />
          </Field>
          <Field label={t('timetable.slot.mode')}>
            <Select options={modeOptions} value={mode} onChange={(e) => setMode(e.target.value as DeliveryMode)} aria-label={t('timetable.slot.mode')} />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t('timetable.slot.effectiveFrom')} hint={t('timetable.slot.effectiveHint')}>
            <Input type="date" className="ef-num" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} aria-label={t('timetable.slot.effectiveFrom')} />
          </Field>
          <Field label={t('timetable.slot.effectiveTo')}>
            <Input type="date" className="ef-num" value={effectiveTo} onChange={(e) => setEffectiveTo(e.target.value)} aria-label={t('timetable.slot.effectiveTo')} />
          </Field>
        </div>
      </div>
    </Dialog>
  );
}
