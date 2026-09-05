import { describe, expect, it } from 'vitest';
import { formatHijriDate } from './format';

describe('formatHijriDate', () => {
  it('renders a Gregorian date as its full Arabic Hijri equivalent', () => {
    // The trap this guards: `ar-EG` defaults to the Gregorian calendar, so
    // dropping the `-ca-islamic-umalqura` pin would silently show 2026, not the
    // Hijri year. Fully Arabic — names and Arabic-Indic numerals.
    expect(formatHijriDate(new Date('2026-09-05'))).toBe('السبت، ٢٣ ربيع الأول ١٤٤٨ هـ');
  });
});
