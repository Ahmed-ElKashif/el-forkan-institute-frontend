import { api } from '../../shared/api/api';
import { DEFAULT_PAGE_SIZE, toQueryString, type Page } from '../../shared/api/pagination';
import type { AuditLog, AuditQuery } from './audit.model';

const auditApi = api.injectEndpoints({
  endpoints: (build) => ({
    // Read-only and head-teacher only. Server-paginated so the log — which grows
    // without bound — is never fetched whole.
    auditLogs: build.query<Page<AuditLog>, AuditQuery>({
      query: ({ page, entityType }) => ({
        path: `/audit-logs?${toQueryString({ page, pageSize: DEFAULT_PAGE_SIZE, entityType })}`,
      }),
    }),
  }),
});

export const { useAuditLogsQuery } = auditApi;
