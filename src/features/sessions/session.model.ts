/* A scheduled/held/cancelled session, mirrored from the API
   (backend src/teaching/sessions.service.ts `SessionView`), narrowed to what the
   management screen shows and edits. Times are `HH:MM` in the form; the list
   read may carry seconds, so a helper trims them. */

export interface Session {
  id: string;
  subjectNameAr: string;
  sessionNo: number | null;
  sessionDate: string;
  startsAt: string;
  endsAt: string;
  mode: string;
  room: string | null;
  meetingUrl: string | null;
  status: string;
  cancelReason: string | null;
}

/** `PATCH /sessions/:id` — every field optional; an omitted key is left as is. */
export interface UpdateSessionInput {
  sessionDate?: string;
  startsAt?: string;
  endsAt?: string;
  mode?: string;
  room?: string | null;
  meetingUrl?: string | null;
  status?: string;
  cancelReason?: string | null;
}

export interface SessionsQuery {
  sectionId: string;
  page: number;
}
