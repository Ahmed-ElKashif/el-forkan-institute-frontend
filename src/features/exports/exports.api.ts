import { api } from '../../shared/api/api';
import { toQueryString } from '../../shared/api/pagination';

/* Only the PREVIEW lives in RTK Query. The download deliberately does not:
   it is a binary the browser saves, and RTK Query's cache is not a place to
   hold a Blob — so `ExportsPage` fetches the file through the raw `http` seam
   with `responseType: 'blob'`. Reading rows and saving a file are different
   jobs, and they use different tools on purpose. */

export interface ExportSheet {
  name: string;
  headers: string[];
  rows: string[][];
}

export interface ExportPreview {
  sheets: ExportSheet[];
  rowCount: number;
}

export interface ExportPreviewParams {
  kind: 'roster' | 'results';
  academicYearId: number;
  levelId?: number;
}

const exportsApi = api.injectEndpoints({
  endpoints: (build) => ({
    exportPreview: build.query<ExportPreview, ExportPreviewParams>({
      query: ({ kind, academicYearId, levelId }) => ({
        path: `/exports/${kind}/preview?${toQueryString({ academicYearId, levelId })}`,
      }),
    }),
  }),
});

export const { useLazyExportPreviewQuery } = exportsApi;
