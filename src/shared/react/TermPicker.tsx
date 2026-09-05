import { useTranslation } from 'react-i18next';
import { Select, formatNumber, type SelectOption } from '../../ds';
import type { Term } from '../api/calendar';

/** The term dropdown shared by the attendance and score grids: both pick a term
 *  to scope the sheet they load, and the control is identical, so it lives here
 *  rather than once per feature. */
export function TermPicker({
  terms,
  value,
  onChange,
}: {
  terms: Term[];
  value: number | null;
  onChange: (termId: number) => void;
}) {
  const { t } = useTranslation();
  const options: SelectOption[] = terms.map((term) => ({
    value: term.id,
    label: t('calendar.termLabel', { n: formatNumber(term.termNumber) }),
  }));
  return (
    <Select
      aria-label={t('calendar.termPickerLabel')}
      options={options}
      value={value ?? ''}
      onChange={(e) => onChange(Number(e.target.value))}
      wrapperClassName="w-44"
    />
  );
}
