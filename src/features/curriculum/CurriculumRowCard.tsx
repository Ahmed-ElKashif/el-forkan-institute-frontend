import { useTranslation } from 'react-i18next';
import { Badge, Card, IconButton, formatNumber, formatScore } from '../../ds';
import type { CurriculumRow, CurriculumTreeNode, CurriculumUnit } from './curriculum.model';

/** The actions a row and its units raise; the page owns the dialogs and writes. */
export interface RowActions {
  onEdit: (row: CurriculumRow) => void;
  onDelete: (row: CurriculumRow) => void;
  onAddChild: (row: CurriculumRow) => void;
  onAddUnit: (row: CurriculumRow) => void;
  onEditUnit: (row: CurriculumRow, unit: CurriculumUnit) => void;
  onDeleteUnit: (unit: CurriculumUnit) => void;
}

/** One مادة card: the parent row, then its فروع indented beneath it. Nesting is
 *  two levels, so this never recurses — a child renders as a plain row. */
export function CurriculumRowCard({ node, actions }: { node: CurriculumTreeNode; actions: RowActions }) {
  return (
    <Card bodyClassName="p-4">
      <RowBody row={node} actions={actions} />
      {node.children.length > 0 ? (
        <div className="mt-3 space-y-3">
          {node.children.map((child) => (
            <div key={child.id} className="border-s-2 border-subtle ps-4">
              <RowBody row={child} isChild actions={actions} />
            </div>
          ))}
        </div>
      ) : null}
    </Card>
  );
}

function RowBody({ row, isChild = false, actions }: { row: CurriculumRow; isChild?: boolean; actions: RowActions }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-ink-900">{row.subjectNameAr}</span>
            {row.isMandatory ? <Badge tone="warning">{t('curriculum.badges.mandatory')}</Badge> : null}
            {row.isExaminable ? (
              <>
                <Badge tone="neutral">{t(`curriculum.gradingModes.${row.gradingMode}`)}</Badge>
                <Badge tone="neutral">{t(`curriculum.assessmentTypes.${row.assessmentType}`)}</Badge>
              </>
            ) : (
              <Badge tone="info">{t('curriculum.badges.container')}</Badge>
            )}
          </div>
          {row.isExaminable ? (
            <p className="m-0 text-xs text-ink-500">
              {t('curriculum.scoreSummary', {
                max: formatScore(row.maxScore),
                pass: formatScore(row.passScore),
                weight: formatScore(row.weight),
              })}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-1">
          <IconButton icon="plus" label={t('curriculum.units.add')} size="sm" onClick={() => actions.onAddUnit(row)} />
          {!isChild ? (
            <IconButton icon="rows-3" label={t('curriculum.addChild')} size="sm" onClick={() => actions.onAddChild(row)} />
          ) : null}
          <IconButton icon="pencil" label={t('curriculum.edit')} size="sm" onClick={() => actions.onEdit(row)} />
          <IconButton icon="trash" label={t('curriculum.delete')} size="sm" onClick={() => actions.onDelete(row)} />
        </div>
      </div>

      {row.units.length > 0 ? (
        <ul className="m-0 list-none space-y-1 p-0">
          {row.units.map((unit) => (
            <li key={unit.id} className="flex items-start gap-2 rounded-md bg-canvas px-3 py-2 text-sm">
              <div className="min-w-0 flex-1">
                <span className="text-ink-800">{unit.syllabusScopeAr}</span>
                {unit.unitLabel ? <span className="text-ink-500"> · {unit.unitLabel}</span> : null}
                {unit.bookTitleAr ? <span className="text-ink-500"> — {unit.bookTitleAr}</span> : null}
                {unit.alternativeGroup != null ? (
                  <Badge tone="neutral" size="sm" className="ms-2">{t('curriculum.units.alt', { n: formatNumber(unit.alternativeGroup) })}</Badge>
                ) : null}
              </div>
              <div className="flex shrink-0 gap-1">
                <IconButton icon="pencil" label={t('curriculum.units.edit')} size="sm" onClick={() => actions.onEditUnit(row, unit)} />
                <IconButton icon="trash" label={t('curriculum.units.delete')} size="sm" onClick={() => actions.onDeleteUnit(unit)} />
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
