// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { AuditPage } from './AuditPage';
import type { AuditLog } from './audit.model';
import { makeStore } from '../../shared/api/store';
import { toQueryString, type Page } from '../../shared/api/pagination';
import { stubHttpClient, type StubRoutes } from '../../test/stub-http-client';
import '../../shared/i18n';

/* The audit viewer is the head teacher's window onto who changed what, and
   everything the API writes into it is English — the action, the record kind and
   the field names inside the snapshot. These prove all three are rendered in
   Arabic, and that an action the translations do not know yet still shows its
   raw name rather than a blank cell or an i18n path. */

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
  it('renders the action and the record kind in Arabic, not as written', async () => {
    renderAudit({ [key]: pageOf([LOG]) });

    expect(await screen.findByText('محمود عبد الله')).toBeDefined();
    expect(screen.getByText('إضافة طالب')).toBeDefined();
    expect(screen.queryByText('student.create')).toBeNull();
    // Scoped to the table: «طالب» is also an option in the filter above it.
    const table = screen.getByRole('table');
    expect(within(table).getByText('طالب')).toBeDefined();
    expect(within(table).getByText(/s1/)).toBeDefined();
  });

  it('names the snapshot fields in Arabic and shows the value', async () => {
    renderAudit({ [key]: pageOf([LOG]) });
    await screen.findByText('محمود عبد الله');

    await userEvent.click(screen.getByRole('button', { name: 'إجراءات' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'التفاصيل' }));

    // A create has no "before", so the single column is the value itself.
    expect(screen.getByText('الاسم')).toBeDefined();
    expect(screen.getByText('أحمد سالم')).toBeDefined();
    expect(screen.queryByText('fullName')).toBeNull();
  });

  it('shows both sides of an edit and marks what changed', async () => {
    renderAudit({
      [key]: pageOf([
        {
          ...LOG,
          action: 'subject.update',
          entityType: 'subject',
          before: { nameAr: 'سيرة', isActive: true },
          after: { nameAr: 'السيرة', isActive: true },
        },
      ]),
    });
    await screen.findByText('تعديل مادة');

    await userEvent.click(screen.getByRole('button', { name: 'إجراءات' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'التفاصيل' }));

    expect(screen.getByText('قبل')).toBeDefined();
    expect(screen.getByText('سيرة')).toBeDefined();
    expect(screen.getByText('السيرة')).toBeDefined();
    // Booleans are words, not `true`.
    expect(screen.getAllByText('نعم').length).toBe(2);
  });

  it('falls back to the raw name for an action it has no translation for', async () => {
    // A new server action must stay recognisable rather than rendering blank or
    // leaking an i18n path like `audit.actions.exam_regrade`.
    renderAudit({ [key]: pageOf([{ ...LOG, action: 'exam.regrade' }]) });

    expect(await screen.findByText('exam.regrade')).toBeDefined();
  });
});
