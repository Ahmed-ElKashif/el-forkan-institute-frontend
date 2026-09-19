import { useSearchParams } from 'react-router-dom';
import { useCurrentAcademicYearQuery } from '../../shared/api/calendar';
import { useListSectionsQuery, type Section } from '../sections';
import { useLevelsQuery, type Level } from '../catalogue';
import { findSection, type Gender } from './level.model';

/** The chosen cohort, in `?gender=`, so a boys/girls switch is shareable and
 *  survives a reload. Defaults to boys; an unknown value falls back rather than
 *  resolving no class. Shared by the level hub and the level-scoped attendance
 *  and scores pages. */
export function useGenderParam(): [Gender, (gender: Gender) => void] {
  const [params, setParams] = useSearchParams();
  const gender: Gender = params.get('gender') === 'female' ? 'female' : 'male';
  const setGender = (next: Gender) =>
    setParams(
      (previous) => {
        const merged = new URLSearchParams(previous);
        merged.set('gender', next);
        return merged;
      },
      { replace: true },
    );
  return [gender, setGender];
}

export interface ResolvedLevelSection {
  /** The level, or undefined once loaded if the id is unknown (see `notFound`). */
  level: Level | undefined;
  /** The gendered class the (level, gender) resolves to for the current year, or
   *  undefined when this cohort has no class provisioned yet. */
  section: Section | undefined;
  /** The current academic year's id (0 until it loads). */
  yearId: number;
  isLoading: boolean;
  /** The level id does not exist (loaded, but no match) — distinct from a level
   *  that exists but has no class for this gender (`section` undefined). */
  notFound: boolean;
}

/** Resolves `(levelId, gender, current year) → section`, the lookup the level
 *  hub, the attendance page and the scores page all share. A level owns exactly
 *  one class per gender (`sections` UNIQUE (branch, year, level, gender)), so
 *  this is a lookup, not a filter that can return many. */
export function useLevelSection(levelId: number, gender: Gender): ResolvedLevelSection {
  const levels = useLevelsQuery();
  const year = useCurrentAcademicYearQuery();
  const yearId = year.data?.id ?? 0;
  const sections = useListSectionsQuery(
    { academicYearId: yearId, page: 1, pageSize: 100 },
    { skip: year.data == null },
  );

  const isLoading = levels.isLoading || year.isLoading || sections.isLoading;
  const level = levels.data?.find((l) => l.id === levelId);

  return {
    level,
    section: findSection(sections.data?.items, levelId, gender),
    yearId,
    isLoading,
    notFound: !isLoading && level == null,
  };
}
