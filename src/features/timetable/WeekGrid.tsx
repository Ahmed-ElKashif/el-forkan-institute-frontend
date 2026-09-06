import { useTranslation } from 'react-i18next';
import { ActionMenu, Badge, Card, useRowContextMenu, type ActionItem, type BadgeProps } from '../../ds';
import { groupByWeekday, type DeliveryMode, type TimetableSlot } from './timetable.model';

const MODE_TONE: Record<DeliveryMode, BadgeProps['tone']> = {
  onsite: 'neutral',
  online: 'info',
  hybrid: 'brand',
};

/** The weekly view: one card per teaching day, its slots ordered within the day.
 *  Presentation only — it groups the slots it is given and raises edit/delete. */
export function WeekGrid({ slots, onEdit, onDelete }: { slots: TimetableSlot[]; onEdit: (slot: TimetableSlot) => void; onDelete: (slot: TimetableSlot) => void }) {
  const { t } = useTranslation();
  const groups = groupByWeekday(slots);

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <Card key={group.weekday} bodyClassName="p-4">
          <h3 className="mb-3 text-sm font-bold text-ink-900">{t(`timetable.weekdays.${group.weekday}`)}</h3>
          <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {group.slots.map((slot) => (
              <SlotItem key={slot.id} slot={slot} onEdit={onEdit} onDelete={onDelete} />
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}

/** One slot tile with the standard 3-dots + right-click actions. */
function SlotItem({ slot, onEdit, onDelete }: { slot: TimetableSlot; onEdit: (slot: TimetableSlot) => void; onDelete: (slot: TimetableSlot) => void }) {
  const { t } = useTranslation();
  const items: ActionItem[] = [
    { key: 'edit', label: t('timetable.edit'), icon: 'pencil', onSelect: () => onEdit(slot) },
    { key: 'delete', label: t('timetable.delete'), icon: 'trash', tone: 'danger', onSelect: () => onDelete(slot) },
  ];
  const { onContextMenu, menu } = useRowContextMenu(items);
  return (
    <li className="rounded-md border border-subtle bg-canvas p-3" onContextMenu={onContextMenu}>
      {menu}
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-ink-900">{slot.subjectNameAr}</span>
            <Badge tone={MODE_TONE[slot.mode]} size="sm">{t(`timetable.modes.${slot.mode}`)}</Badge>
          </div>
          <p className="m-0 text-xs text-ink-600 ef-num" dir="ltr">{slot.startsAt}–{slot.endsAt}</p>
          <p className="m-0 text-xs text-ink-500">
            {slot.teacherName ?? t('timetable.slot.unassigned')}
            {slot.room ? ` · ${slot.room}` : ''}
          </p>
        </div>
        <div className="shrink-0">
          <ActionMenu items={items} />
        </div>
      </div>
    </li>
  );
}
