import { useTranslation } from 'react-i18next';
import { ActionMenu, Badge, Card, formatScore, useRowContextMenu, type ActionItem } from '../../ds';
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
 *  two levels, so this never recurses — a child renders as a plain row.
 *
 *  `actions` absent means the card is a read-only view of the plan: no 3-dots
 *  menu and no right-click menu. Everything else renders the same, so the level
 *  hub can show the full syllabus without being a second place to edit it. */
export function CurriculumRowCard({ node, actions }: { node: CurriculumTreeNode; actions?: RowActions }) {
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

function RowBody({ row, isChild = false, actions }: { row: CurriculumRow; isChild?: boolean; actions?: RowActions }) {
  const { t } = useTranslation();
  const rowItems: ActionItem[] = actions
    ? [
        { key: 'addUnit', label: t('curriculum.books.add'), icon: 'plus', onSelect: () => actions.onAddUnit(row) },
        /* Splitting is offered only on a top-level مادة: nesting is two levels deep,
           so a فرع has nowhere further to split to. */
        ...(!isChild ? [{ key: 'addChild', label: t('curriculum.addChild'), icon: 'rows-3' as const, onSelect: () => actions.onAddChild(row) }] : []),
        { key: 'edit', label: t('curriculum.edit'), icon: 'pencil', onSelect: () => actions.onEdit(row) },
        { key: 'delete', label: t('curriculum.delete'), icon: 'trash', tone: 'danger', onSelect: () => actions.onDelete(row) },
      ]
    : [];
  const { onContextMenu, menu } = useRowContextMenu(rowItems);
  return (
    <div className="space-y-2" onContextMenu={actions ? onContextMenu : undefined}>
      {actions ? menu : null}
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
              })}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="shrink-0">
            <ActionMenu items={rowItems} />
          </div>
        ) : null}
      </div>

      {row.units.length > 0 ? (
        <ul className="m-0 list-none space-y-1 p-0">
          {row.units.map((unit) => (
            <UnitRow key={unit.id} row={row} unit={unit} actions={actions} />
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** One prescribed book under a مادة, with the same 3-dots + right-click menu.
 *
 *  The book leads and the scope follows it, because "الروض المربع" is what the
 *  head teacher is looking for; the old row led with the scope text and left the
 *  book trailing after a dash. The label and the alternative-group number are no
 *  longer shown — neither told anyone anything, and both are gone from the form. */
function UnitRow({ row, unit, actions }: { row: CurriculumRow; unit: CurriculumUnit; actions?: RowActions }) {
  const { t } = useTranslation();
  const items: ActionItem[] = actions
    ? [
        { key: 'edit', label: t('curriculum.books.edit'), icon: 'pencil', onSelect: () => actions.onEditUnit(row, unit) },
        { key: 'delete', label: t('curriculum.books.remove'), icon: 'trash', tone: 'danger', onSelect: () => actions.onDeleteUnit(unit) },
      ]
    : [];
  const { onContextMenu, menu } = useRowContextMenu(items);
  return (
    <li className="flex items-start gap-2 rounded-md bg-canvas px-3 py-2 text-sm" onContextMenu={actions ? onContextMenu : undefined}>
      {actions ? menu : null}
      <div className="min-w-0 flex-1">
        <span className="font-semibold text-ink-800">{unit.bookTitleAr ?? t('curriculum.books.noBook')}</span>
        <span className="text-ink-500"> — {unit.syllabusScopeAr}</span>
        {unit.alternativeGroup != null ? (
          <Badge tone="neutral" size="sm" className="ms-2">{t('curriculum.books.alternative')}</Badge>
        ) : null}
      </div>
      {actions ? (
        <div className="shrink-0">
          <ActionMenu items={items} />
        </div>
      ) : null}
    </li>
  );
}
