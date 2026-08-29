import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ar from './ar.json';

/* ---------------------------------------------------------------------------
   i18next.

   Arabic is the only locale, and yet the indirection earns its place: it keeps
   every user-facing string in one reviewable file the head teacher can read
   without opening a component, and it is what lets a domain error carry a
   `messageKey` instead of a sentence.

   Numerals are NOT formatted here. Every number in this product is a Latin
   digit, and `Intl.NumberFormat('ar-EG')` resolves to the `arab` numbering
   system — ١٬٤٤٧ — so anything that formats by locale alone is wrong for this
   product. Formatting goes through the `ds` barrel's `formatNumber` /
   `formatScore`, which pin `ar-EG-u-nu-latn`.
--------------------------------------------------------------------------- */

export const DEFAULT_LOCALE = 'ar';

void i18n.use(initReactI18next).init({
  resources: { ar: { translation: ar } },
  lng: DEFAULT_LOCALE,
  fallbackLng: DEFAULT_LOCALE,
  interpolation: {
    /* React escapes for us; double-escaping mangles Arabic punctuation. */
    escapeValue: false,
  },
});

export default i18n;
