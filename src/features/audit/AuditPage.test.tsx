// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { AuditPage } from './AuditPage';
import type { AuditLog } from './audit.model';
import { makeStore } from '../../shared/api/store';
import { toQueryString, type Page } from '../../shared/api/pagination';
import { stubHttpClient, type StubRoutes } from '../../test/stub-http-client';
import '../../shared/i18n';

/* Proves the audit viewer renders a row and opens its before/after snapshot —
   the head teacher's window onto who changed what. Real store against a stub. */

const LOG: AuditLog = {
  id: 'a1',
  actorId: 'u1',
  actorName: 'محمود عبد الله',
  action: 'student.create',
  entityType: 'student',
  entityId: 's1',
  before: null,
  after: { fullName: 'أحمد سالم' },
  ipAddress: '1.2.3.4',
  createdAt: '2026-08-30T10:15:00Z',
};

function pageOf(items: AuditLog[]): Page<AuditLog> {
  return { items, total: items.length, page: 1, pageSize: 25 };
}

const key = `GET /audit-logs?${toQueryString({ page: 1, pageSize: 25 })}`;

function renderAudit(routes: StubRoutes) {
  const http = stubHttpClient(routes);
  render(
    <Provider store={makeStore(http)}>
      <AuditPage />
    </Provider>,
  );
  return http;
}

afterEach(cleanup);

describe('AuditPage', () => {
  it('lists an entry and opens its before/after snapshot', async () => {
    renderAudit({ [key]: pageOf([LOG]) });

    expect(await screen.findByText('محمود عبد الله')).toBeDefined();
    expect(screen.getByText('student.create')).toBeDefined();

    await userEvent.click(screen.getByRole('button', { name: 'التفاصيل' }));

    // The dialog shows the "after" snapshot with the changed field.
    expect(screen.getByText('بعد')).toBeDefined();
    expect(screen.getByText(/أحمد سالم/)).toBeDefined();
  });
});
