import { useSearchParams } from 'react-router-dom';

/** The year, level and term every tab of the study plan is read against. */
export interface CatalogueScope {
  yearId: number | null;
  levelId: number | null;
  termNumber: number;
}

/**
 * The study plan's shared scope, kept in the URL as `?year=&level=&term=`.
 *
 * One context for the whole screen is what makes «كتب المستوى الثاني — الفصل
 * الأول» an ordinary thing to look at: before this each tab scoped itself
 * differently, so the books tab could not be asked that question at all.
 *
 * In the URL rather than in state so a scope is shareable and survives a reload,
 * and so the level hub can link into a specific one. The query string is
 * user-editable, so every value is treated as untrusted and falls back rather
 * than rendering an empty screen: absent, non-numeric, zero and negative all
 * become the caller's default, and the term is only ever 1 or 2 (R6).
 *
 * Written with `replace`, so changing scope does not bury the page the user
 * arrived from under a stack of history entries.
 */
export function useCatalogueScope(defaults: {
  yearId: number | null;
  levelId: number | null;
}): [CatalogueScope, (patch: Partial<CatalogueScope>) => void] {
  const [params, setParams] = useSearchParams();

  const readId = (key: string): number | null => {
    const value = Number(params.get(key));
    return Number.isInteger(value) && value > 0 ? value : null;
  };

  const scope: CatalogueScope = {
    yearId: readId('year') ?? defaults.yearId,
    levelId: readId('level') ?? defaults.levelId,
    termNumber: readId('term') === 2 ? 2 : 1,
  };

  const setScope = (patch: Partial<CatalogueScope>) => {
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (patch.yearId != null) next.set('year', String(patch.yearId));
        if (patch.levelId != null) next.set('level', String(patch.levelId));
        if (patch.termNumber != null) next.set('term', String(patch.termNumber));
        return next;
      },
      { replace: true },
    );
  };

  return [scope, setScope];
}
