import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { EmptyState } from '../../ds';
import { ListSkeleton } from '../../shared/react/PagedList';
import { AttendanceTab } from '../attendance';
import { LevelGenderHeader } from './LevelGenderHeader';
import { useGenderParam, useLevelSection } from './useLevelSection';

/** The teacher's Attendance task, scoped to one level. Reached from the
 *  Attendance nav (a level picker) and stays on `/attendance` — picking a level
 *  filters the attendance view in place rather than bouncing to the level hub.
 *  The boys/girls filter switches cohort; the body is the same date-first sheet
 *  the hub embeds, so nothing about marking a day changes. */
export function LevelAttendancePage() {
  const { t } = useTranslation();
  const { levelId: param = '' } = useParams();
  const levelId = Number(param);
  const [gender, setGender] = useGenderParam();
  const { level, section, yearId, isLoading, notFound } = useLevelSection(levelId, gender);

  if (isLoading) return <ListSkeleton />;
  if (notFound || level == null) {
    return (
      <EmptyState
        icon="book-open"
        title={t('levels.detail.notFound.title')}
        description={t('levels.detail.notFound.description')}
      />
    );
  }

  return (
    <div className="space-y-4">
      <LevelGenderHeader
        title={level.nameAr}
        backTo="/attendance"
        backLabel={t('levels.backToLevels')}
        gender={gender}
        onGenderChange={setGender}
      />
      {section == null ? (
        <EmptyState
          icon="users"
          title={t('levels.detail.noCohort.title')}
          description={t('levels.detail.noCohort.description')}
        />
      ) : (
        <AttendanceTab sectionId={section.id} academicYearId={yearId} />
      )}
    </div>
  );
}
