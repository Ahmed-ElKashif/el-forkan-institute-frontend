import { api } from '../../shared/api/api';
import { toQueryString, type Page } from '../../shared/api/pagination';
import type { FixRowPatch, ImportJob, ImportRow, RowAction } from './import.model';

/* The upload itself (`POST /imports`, multipart) is not here: it sends a
   FormData body and returns a job, with no cache to seed, so ImportPage calls
   the transport directly. Everything after — reading the job and its rows,
   fixing a row, committing — is cacheable and lives on RTK Query, tagged
   `Import` so a fix or commit refreshes the rows and the counts together. */
const importApi = api.injectEndpoints({
  endpoints: (build) => ({
    importJob: build.query<ImportJob, string>({
      query: (id) => ({ path: `/imports/${id}` }),
      providesTags: ['Import'],
    }),
    importRows: build.query<Page<ImportRow>, { jobId: string; page: number; action?: RowAction }>({
      query: ({ jobId, page, action }) => ({
        path: `/imports/${jobId}/rows?${toQueryString({ page, action })}`,
      }),
      providesTags: ['Import'],
    }),
    fixImportRow: build.mutation<ImportRow, { rowId: string; patch: FixRowPatch }>({
      query: ({ rowId, patch }) => ({
        method: 'PATCH',
        path: `/imports/rows/${rowId}`,
        body: patch,
      }),
      invalidatesTags: ['Import'],
    }),
    commitImport: build.mutation<ImportJob, string>({
      query: (id) => ({ method: 'POST', path: `/imports/${id}/commit` }),
      invalidatesTags: ['Import'],
    }),
  }),
});

export const {
  useImportJobQuery,
  useImportRowsQuery,
  useFixImportRowMutation,
  useCommitImportMutation,
} = importApi;
