import { api } from '../../shared/api/api';
import type { CreateSlotInput, TimetableSlot, UpdateSlotInput } from './timetable.model';

/* One read (a section's slots) and four writes. Create and update are
   clash-checked server-side and answer 409 on a teacher double-booking; the
   dialogs surface that message. Every slot write invalidates `Timetable` so the
   grid re-reads. Session generation writes sessions, not slots, so it has
   nothing to invalidate here. */
const timetableApi = api.injectEndpoints({
  endpoints: (build) => ({
    timetableSlots: build.query<TimetableSlot[], string>({
      query: (sectionId) => ({ path: `/sections/${sectionId}/timetable` }),
      providesTags: ['Timetable'],
    }),
    createSlot: build.mutation<TimetableSlot, { sectionId: string; body: CreateSlotInput }>({
      query: ({ sectionId, body }) => ({ method: 'POST', path: `/sections/${sectionId}/timetable`, body }),
      invalidatesTags: ['Timetable'],
    }),
    updateSlot: build.mutation<TimetableSlot, { id: string; patch: UpdateSlotInput }>({
      query: ({ id, patch }) => ({ method: 'PATCH', path: `/timetable-slots/${id}`, body: patch }),
      invalidatesTags: ['Timetable'],
    }),
    removeSlot: build.mutation<void, string>({
      query: (id) => ({ method: 'DELETE', path: `/timetable-slots/${id}` }),
      invalidatesTags: ['Timetable'],
    }),
    generateSessions: build.mutation<{ created: number; skipped: number }, { sectionId: string; termId: number; offDays: string[] }>({
      query: ({ sectionId, termId, offDays }) => ({ method: 'POST', path: `/sections/${sectionId}/sessions/generate`, body: { termId, offDays } }),
    }),
  }),
});

export const {
  useTimetableSlotsQuery,
  useCreateSlotMutation,
  useUpdateSlotMutation,
  useRemoveSlotMutation,
  useGenerateSessionsMutation,
} = timetableApi;
