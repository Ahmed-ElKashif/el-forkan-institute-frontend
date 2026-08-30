import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { EmptyState } from '../../ds';
import { activeDestination } from './navigation';

/** Honest stand-in for a screen a later phase delivers.
 *
 *  The frame and navigation are real as of F0c; the screens behind them arrive
 *  in F1–F6. Rather than fake data, each destination states what it is and
 *  which phase builds it, so the whole sidebar can be walked end to end without
 *  pretending a screen exists. Replaced route by route as the phases land. */
export function SectionPlaceholder() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const destination = activeDestination(pathname);

  return (
    <EmptyState
      icon={destination.icon}
      title={t(destination.labelKey)}
      description={t('placeholder.description', { phase: destination.phase })}
    />
  );
}
