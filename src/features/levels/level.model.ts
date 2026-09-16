import type { Section } from '../sections';

/** The two cohorts a level is taught in. Boys and girls are separate classes
 *  under one level (R3, "no mixed levels"); the level hub shows one level and
 *  filters between them rather than listing both as their own rows. */
export type Gender = 'male' | 'female';

export const GENDERS: readonly Gender[] = ['male', 'female'];

/** The gendered class a (level, gender) resolves to for the loaded year. A level
 *  owns exactly one class per gender (`sections` UNIQUE (branch, year, level,
 *  gender)), so this is a lookup, not a filter that can return many. */
export function findSection(
  sections: Section[] | undefined,
  levelId: number,
  gender: Gender,
): Section | undefined {
  return sections?.find((s) => s.levelId === levelId && s.gender === gender);
}
