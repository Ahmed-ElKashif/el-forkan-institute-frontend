// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { ImportPreview } from './ImportPreview';
import type { ImportJob, ImportRow } from './import.model';
import { makeStore } from '../../shared/api/store';
import { toQueryString } from '../../shared/api/pagination';
import { stubHttpClient, type StubRoutes } from '../../test/stub-http-client';
import '../../shared/i18n';

/* Proves the F4 exit criteria: the preview shows an action per row, the commit
   stays disabled while an error remains, and fixing a row posts a patch. Runs
   the real store, RTK cache and DataTable against a stub — nothing is written. */

const ROW_OK: ImportRow = {
  id: '10',
  sheetName: 'إخوة',
  rowNumber: 1,
  action: 'create',
  errorMessage: null,
  raw: { fullName: 'أحمد سالم', phone: '+201000000000' },
  parsed: { fullName: 'أحمد سالم' },
};
const ROW_ERR: ImportRow = {
  id: '11',
  sheetName: 'إخوة',
  rowNumber: 2,
  action: 'error',
  errorMessage: 'اسم مفقود',
  raw: { fullName: '', phone: null },
  parsed: null,
};

function job(overrides: Partial<ImportJob>): ImportJob {
  return {
    id: 'job1',
    importType: 'roster',
    status: 'preview',
    originalFilename: 'roster.xlsx',
    totalRows: 2,
    okRows: 1,
    failedRows: 1,
    committedAt: null,
    countsByAction: { create: 1, update: 0, skip: 0, error: 1 },
    ...overrides,
  };
}

const rowsKey = `GET /imports/job1/rows?${toQueryString({ page: 1 })}`;

function renderPreview(routes: StubRoutes) {
  const http = stubHttpClient(routes);
  render(
    <Provider store={makeStore(http)}>
      <ImportPreview jobId="job1" onReset={() => {}} />
    </Provider>,
  );
  return http;
}

afterEach(cleanup);

describe('ImportPreview', () => {
  it('shows an action per row and disables commit while an error remains', async () => {
    renderPreview({
      'GET /imports/job1': job({}),
      [rowsKey]: { items: [ROW_OK, ROW_ERR], total: 2, page: 1, pageSize: 25 },
    });

    await screen.findByText('أحمد سالم');
    expect(screen.getByText('اسم مفقود')).toBeDefined();

    const commit = screen.getByRole('button', { name: 'تنفيذ الاستيراد' }) as HTMLButtonElement;
    expect(commit.disabled).toBe(true);
  });

  it('commits when no error rows remain', async () => {
    const http = renderPreview({
      'GET /imports/job1': job({ countsByAction: { create: 2, update: 0, skip: 0, error: 0 }, failedRows: 0, okRows: 2 }),
      [rowsKey]: { items: [ROW_OK], total: 1, page: 1, pageSize: 25 },
      'POST /imports/job1/commit': job({ status: 'committed', okRows: 2 }),
    });
    await screen.findByText('أحمد سالم');

    const commit = screen.getByRole('button', { name: 'تنفيذ الاستيراد' }) as HTMLButtonElement;
    expect(commit.disabled).toBe(false);
    await userEvent.click(commit);

    await waitFor(() => expect(http.countOf('POST /imports/job1/commit')).toBe(1));
  });

  it('sends a patch when a row is fixed inline', async () => {
    const http = renderPreview({
      'GET /imports/job1': job({}),
      [rowsKey]: { items: [ROW_OK, ROW_ERR], total: 2, page: 1, pageSize: 25 },
      'PATCH /imports/rows/11': { ...ROW_ERR, action: 'create', errorMessage: null },
    });
    await screen.findByText('أحمد سالم');

    // The error row is the second; open its 3-dots menu, then the fix dialog.
    await userEvent.click(screen.getAllByRole('button', { name: 'إجراءات' })[1]);
    await userEvent.click(screen.getByRole('menuitem', { name: 'تصحيح' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'الاسم' }), 'أحمد المصحّح');
    await userEvent.click(screen.getByRole('button', { name: 'حفظ التصحيح' }));

    await waitFor(() => expect(http.countOf('PATCH /imports/rows/11')).toBe(1));
    const patch = http.calls.find((c) => c.method === 'PATCH' && c.path === '/imports/rows/11');
    const body = patch?.body as { fullName?: string } | undefined;
    expect(body?.fullName).toBe('أحمد المصحّح');
  });
});
