import { describe, expect, it } from 'vitest';
import { formatClassDate, formatGregorianDate, formatHijriDate } from './format';

describe('formatHijriDate', () => {
  it('renders a Gregorian date as its full Arabic Hijri equivalent', () => {
    // The trap this guards: `ar-EG` defaults to the Gregorian calendar, so
    // dropping the `-ca-islamic-umalqura` pin would silently show 2026, not the
    // Hijri year. Fully Arabic — names and Arabic-Indic numerals.
    expect(formatHijriDate(new Date('2026-09-05'))).toBe('السبت، ٢٣ ربيع الأول ١٤٤٨ هـ');
  });
});

describe('formatClassDate', () => {
  // Class days are picked in Hijri, so they read back in Hijri. The same day
  // formatHijriDate renders above, minus the year.
  it('renders a scheduled day in Hijri, without the year', () => {
    expect(formatClassDate('2026-09-05')).toBe('السبت، ٢٣ ربيع الأول');
  });

  // `new Date('2026-09-05')` parses as UTC; west of Greenwich that renders the
  // 4th. Parsing at local midnight is what keeps the day the one that was picked.
  it('reads the date at local midnight, not UTC', () => {
    expect(formatClassDate('2026-09-05')).toBe(
      formatHijriDate(new Date(2026, 8, 5)).replace(' ١٤٤٨ هـ', ''),
    );
  });
});

describe('formatGregorianDate', () => {
  // A date of birth stays Gregorian: it is checked against national IDs and
  // school papers, which are Gregorian. Latin digits, like every other number.
  it('renders a birth date in the Gregorian calendar with Latin digits', () => {
    expect(formatGregorianDate('2009-03-14')).toBe('14 مارس 2009');
  });
});
