import type { TFunction } from 'i18next';

/**
 * The audit log is written in English — `subject.create`, `progression_rule`,
 * `maxScore` — because that is what the API records. The screen is Arabic, so
 * every one of those is looked up here.
 *
 * Keys are flattened with `_` rather than kept as `subject.create`, because
 * i18next reads a dot as nesting: `audit.actions.subject.create` would resolve
 * against an object named `subject`, and a partial match returns the object
 * instead of a string.
 *
 * Every lookup falls back to the raw English. A new action added on the server
 * then shows as `exam.regrade` — recognisable, if untranslated — rather than as
 * a blank cell or a raw i18n path, and it is visibly something to translate.
 */

function flatten(key: string): string {
  return key.replace(/\./g, '_');
}

export function actionLabel(t: TFunction, action: string): string {
  return t(`audit.actions.${flatten(action)}`, { defaultValue: action });
}

export function entityLabel(t: TFunction, entityType: string): string {
  return t(`audit.entities.${flatten(entityType)}`, { defaultValue: entityType });
}

export function fieldLabel(t: TFunction, field: string): string {
  return t(`audit.fields.${flatten(field)}`, { defaultValue: field });
}

/** The record kinds the log can be filtered by, in the order they read as a
 *  list: people first, then what they are taught, then the machinery. Mirrors
 *  the `entityType` values the API writes. */
export const ENTITY_TYPES = [
  'student',
  'enrollment',
  'user',
  'section',
  'session',
  'level',
  'subject',
  'book',
  'curriculum',
  'exam',
  'exam_result',
  'certificate',
  'academic_year',
  'term',
  'progression_rule',
  'attendance_policy',
  'message_template',
  'message_campaign',
  'import_job',
  'export',
  'institute_settings',
  'branch',
  'governorate',
  'markaz',
] as const;

/** One field of a before/after snapshot, ready to render. */
export interface SnapshotField {
  field: string;
  before: unknown;
  after: unknown;
  changed: boolean;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/**
 * The two snapshots aligned field by field.
 *
 * An edit writes both sides and only a few keys differ, so showing the pair and
 * marking what moved is the question an auditor actually has — the old screen
 * printed two JSON blobs and left them to diff it by eye. A create has no
 * `before` and a delete no `after`; both still list their one side, with the
 * missing half absent rather than rendered as a change.
 */
export function snapshotFields(before: unknown, after: unknown): SnapshotField[] {
  const previous = asRecord(before);
  const next = asRecord(after);
  if (previous === null && next === null) return [];

  const fields = [...new Set([...Object.keys(previous ?? {}), ...Object.keys(next ?? {})])];

  return fields.map((field) => ({
    field,
    before: previous?.[field],
    after: next?.[field],
    // Only a real edit — both sides present — can have changed anything.
    changed:
      previous !== null &&
      next !== null &&
      JSON.stringify(previous[field]) !== JSON.stringify(next[field]),
  }));
}
