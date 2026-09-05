/* Timetable shapes, mirrored from the API (src/teaching/timetable.service.ts and
   dto/teaching.schema.ts). A section's timetable is a set of weekly slots; a
   slot is one subject taught by one teacher at a fixed weekday and time. Teacher
   clash detection lives on the server — a create/edit that double-books a teacher
   is refused with a 409 whose message names the conflict, which the UI surfaces. */

export type DeliveryMode = 'onsite' | 'online' | 'hybrid';

export interface TimetableSlot {
  id: string;
  sectionId: string;
  subjectId: number;
  subjectNameAr: string;
  teacherId: string | null;
  teacherName: string | null;
  /** ISO weekday, 1 (Mon) – 7 (Sun); Friday (5) is the institute's default. */
  weekday: number;
  slotOrder: number;
  /** Wall-clock "HH:MM", 24-hour. */
  startsAt: string;
  endsAt: string;
  room: string | null;
  mode: DeliveryMode;
  /** Optional validity window — a slot that applies only for part of the term. */
  effectiveFrom: string | null;
  effectiveTo: string | null;
}

export interface CreateSlotInput {
  subjectId: number;
  teacherId: string | null;
  weekday: number;
  slotOrder: number;
  startsAt: string;
  endsAt: string;
  room: string | null;
  mode: DeliveryMode;
  effectiveFrom: string | null;
  effectiveTo: string | null;
}

/** subjectId is fixed at creation — the API's update schema omits it. */
export type UpdateSlotInput = Partial<Omit<CreateSlotInput, 'subjectId'>>;

export const DELIVERY_MODES: DeliveryMode[] = ['onsite', 'online', 'hybrid'];

/** ISO weekday numbers in Arab-week display order: Saturday → Friday. */
export const WEEKDAY_ORDER = [6, 7, 1, 2, 3, 4, 5];

export interface WeekdaySlots {
  weekday: number;
  slots: TimetableSlot[];
}

/** Groups slots by weekday in display order, dropping empty days and ordering
 *  each day's slots by slotOrder. Pure, so the grid renders it without reshaping. */
export function groupByWeekday(slots: TimetableSlot[]): WeekdaySlots[] {
  return WEEKDAY_ORDER.map((weekday) => ({
    weekday,
    slots: slots
      .filter((slot) => slot.weekday === weekday)
      .sort((a, b) => a.slotOrder - b.slotOrder),
  })).filter((group) => group.slots.length > 0);
}
