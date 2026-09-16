/* Class-day date rules, in the head teacher's own (local) zone so "today" and
   "the coming Friday" match the wall calendar they are looking at. Built from
   local Y/M/D rather than toISOString(), which would shift the day near midnight
   in Cairo (UTC+2/＋3). */

function localIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Today as YYYY-MM-DD. */
export function todayIso(): string {
  return localIso(new Date());
}

/** The coming Friday (today, if today is Friday) as YYYY-MM-DD — the institute's
 *  default lecture day, so a new class day opens on the obvious date. */
export function nextFridayIso(): string {
  const d = new Date();
  // getDay(): 0=Sun … 5=Fri … 6=Sat. Days until the next Friday, 0 when today is.
  d.setDate(d.getDate() + ((5 - d.getDay() + 7) % 7));
  return localIso(d);
}

/** A class day is past once its date is before today. Past days are records —
 *  their structure is locked; upcoming days are still plans and stay editable. */
export function isPastDate(iso: string): boolean {
  return iso < todayIso();
}
