import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Badge, Icon } from '../../ds';
import { GENDERS, type Gender } from './level.model';

/** The shared header for every level-scoped screen: a back link to the picker,
 *  the level name (with an optional action such as the hub's settings gear), and
 *  the boys/girls filter. The hub, the attendance page and the scores page all
 *  render the same chrome so switching cohort feels identical across them. */
export function LevelGenderHeader({
  title,
  backTo,
  backLabel,
  gender,
  onGenderChange,
  action,
}: {
  title: string;
  backTo: string;
  backLabel: string;
  gender: Gender;
  onGenderChange: (gender: Gender) => void;
  action?: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div>
      <Link
        to={backTo}
        className="inline-flex items-center gap-1 text-sm text-ink-500 no-underline hover:text-ink-700"
      >
        <Icon name="chevron-right" size={16} mirror />
        {backLabel}
      </Link>
      <div className="mt-1 mb-2 flex items-center gap-2">
        <h1 className="m-0 text-xl font-bold text-ink-900">{title}</h1>
        {action}
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label={t('levels.detail.genderFilter')}>
        {GENDERS.map((option) => (
          <Badge key={option} pressable active={gender === option} onClick={() => onGenderChange(option)}>
            {t(`levels.detail.gender.${option}`)}
          </Badge>
        ))}
      </div>
    </div>
  );
}
