/* One audit-log row, mirrored from the API (src/settings/settings.service.ts
   `AuditLogView`). `before`/`after` are opaque JSON snapshots shown in the
   details dialog, never interpreted. */
export interface AuditLog {
  id: string;
  actorId: string | null;
  actorName: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  before: unknown;
  after: unknown;
  ipAddress: string | null;
  createdAt: string;
}

/** The list query. `entityType` narrows to one kind of record (students,
 *  certificates, …); an empty value means no filter. */
export interface AuditQuery {
  page: number;
  entityType: string;
}
