/* ---------------------------------------------------------------------------
   Numerals.

   Every number in this product renders as a LATIN digit — 1447, 88.50,
   L4-1447-0001 — because the institute's paperwork uses Latin digits. Eastern
   Arabic numerals never appear, so the locale is pinned with the `-u-nu-latn`
   extension rather than left to the browser.

   Pair these with the `.ef-num` class (tabular-nums) anywhere the number sits
   in a column.
--------------------------------------------------------------------------- */

const LOCALE = 'ar-EG-u-nu-latn';

const integer = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });
const score = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Counts, headcounts, page numbers. */
export function formatNumber(value: number): string {
  return integer.format(value);
}

/** Scores and weights — always two decimals, so columns align. */
export function formatScore(value: number): string {
  return score.format(value);
}

/** Percentages for attendance rates and pass rates. */
export function formatPercent(value: number, fractionDigits = 1): string {
  return new Intl.NumberFormat(LOCALE, {
    style: 'percent',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

/* ---------------------------------------------------------------------------
   Hijri date.

   The institute runs on the Hijri calendar, so the page header shows today's
   full date — weekday, day, month and year — fully in Arabic (Umm al-Qura),
   with Arabic-Indic numerals. Unlike the Latin figures above, the date is
   written the traditional way. `ar-EG` defaults to the Gregorian calendar, so
   the Islamic calendar is pinned with `-ca-`.
--------------------------------------------------------------------------- */

const hijri = new Intl.DateTimeFormat('ar-EG-u-ca-islamic-umalqura-nu-arab', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/** Today's full Hijri date in Arabic, e.g. «السبت، ٢٣ ربيع الأول ١٤٤٨ هـ». */
export function formatHijriDate(date: Date = new Date()): string {
  return hijri.format(date);
}

/* ---------------------------------------------------------------------------
   Class-day date.

   A class day is a specific day the head teacher schedules (nearly always a
   Friday). It is *picked* in Hijri, so it is read back in Hijri — showing
   «الجمعة ١٤ سبتمبر» under a control that offered ربيع الأول would be two
   different calendars for one day. Weekday + day + month, no year: the year is
   already on the screen around it. Takes a plain Gregorian `YYYY-MM-DD`, which
   is what the API stores and returns.
--------------------------------------------------------------------------- */

const classDay = new Intl.DateTimeFormat('ar-EG-u-ca-islamic-umalqura-nu-arab', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

/** A class-day / exam-day date in Hijri, e.g. «الجمعة ٢١ ربيع الأول». */
export function formatClassDate(isoDate: string): string {
  return classDay.format(parseIsoDate(isoDate));
}

/* ---------------------------------------------------------------------------
   Gregorian date.

   The one calendar that stays Gregorian is a date of birth: national IDs and
   every official document a student brings carry a Gregorian one, so showing
   it in Hijri would mean staff converting by hand to check a passport against
   the record. Latin digits, to match the rest of the numerals.
--------------------------------------------------------------------------- */

const gregorianDay = new Intl.DateTimeFormat(LOCALE, {
  year: 'numeric',
  day: 'numeric',
  month: 'long',
});

/** A Gregorian calendar date, e.g. «14 سبتمبر 2009» — birth dates. */
export function formatGregorianDate(isoDate: string): string {
  return gregorianDay.format(parseIsoDate(isoDate));
}

/** `YYYY-MM-DD` as a LOCAL-midnight Date. `new Date(iso)` would parse it as
 *  UTC and render the previous day west of Greenwich. */
function parseIsoDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00`);
}
