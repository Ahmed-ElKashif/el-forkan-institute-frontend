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
