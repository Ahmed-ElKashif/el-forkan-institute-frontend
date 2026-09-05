/* The import shapes this feature renders, mirrored from the API
   (src/import/import.service.ts `ImportJobView` / `ImportRowView`). */

/** Per §6.3 every parsed row resolves to exactly one of these before commit. */
export type RowAction = 'create' | 'update' | 'skip' | 'error';

/** The parsed/raw cell bag a row carries. Only the two fields the preview shows
 *  and the fix form edits are named; the rest stay opaque. */
export interface ImportRowFields {
  fullName?: string | null;
  phone?: string | null;
  [key: string]: unknown;
}

export interface ImportRow {
  /** `import_rows.id` is BIGSERIAL, so it arrives as a decimal string. */
  id: string;
  sheetName: string | null;
  rowNumber: number;
  action: RowAction | null;
  errorMessage: string | null;
  raw: ImportRowFields;
  parsed: ImportRowFields | null;
}

export interface ImportJob {
  id: string;
  importType: string;
  status: string;
  originalFilename: string | null;
  totalRows: number | null;
  okRows: number | null;
  failedRows: number | null;
  committedAt: string | null;
  countsByAction: Record<RowAction, number>;
}

/** The subset of a row a reviewer may correct before commit (the API allows
 *  more; these are the ones the inline fix exposes). */
export interface FixRowPatch {
  fullName?: string;
  phone?: string | null;
  action?: 'create' | 'update' | 'skip';
}
