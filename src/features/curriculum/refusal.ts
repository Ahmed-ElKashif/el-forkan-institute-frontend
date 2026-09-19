/**
 * Turns the API's refusal into an Arabic explanation key.
 *
 * The server guards the syllabus tree — depth is capped at two, a parent must be
 * a container, a row that has فروع cannot itself become one, and a مادة that has
 * been examined cannot be deleted — and it explains each refusal. Those
 * explanations are in English (`ApiError.detail` is documented as never shown to
 * a user), and this screen is Arabic, so the text is used only to tell the
 * refusals apart and the wording the head teacher reads comes from `ar.json`.
 *
 * Before this, every one of these arrived as a bare «تعذّر الحفظ», which is how
 * «إضافة فرع» could fail for a stated reason and still look like a broken button.
 *
 * Matching on substrings of the server's prose is admittedly loose: if a message
 * is reworded the mapping silently falls back to the generic key, which is the
 * behaviour we already had. Keyed on stable fragments to make that unlikely.
 */
export function refusalKey(cause: unknown): string {
  const detail = String((cause as { detail?: unknown } | null | undefined)?.detail ?? '');

  if (detail.includes('nesting is capped')) return 'curriculum.refusal.depth';
  if (detail.includes('cannot itself become')) return 'curriculum.refusal.hasChildren';
  if (detail.includes('not examinable first')) return 'curriculum.refusal.examinableParent';
  if (detail.includes('container')) return 'curriculum.refusal.container';
  if (detail.includes('sub-subjects')) return 'curriculum.refusal.hasChildren';

  return 'curriculum.saveError';
}
