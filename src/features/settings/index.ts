export { SettingsPage } from './SettingsPage';
/* The promotion engine's per-year rules. They live on the settings controller,
   but the head teacher edits them beside the levels they belong to, in the study
   plan — so the endpoint is declared once here and consumed there. */
export {
  useProgressionRulesQuery,
  useUpsertProgressionRuleMutation,
} from './settings.api';
export type { ProgressionRule, ProgressionRuleInput } from './settings.model';
