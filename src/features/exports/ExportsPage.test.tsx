// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { ExportsPage } from './ExportsPage';
import { AuthGateway, AuthService, MemoryTokenStore } from '../auth';
import { DiProvider } from '../../shared/di/DiProvider';
import { makeStore } from '../../shared/api/store';
import { stubHttpClient, type StubRoutes } from '../../test/stub-http-client';
import '../../shared/i18n';

/* The export counterpart to import, and now the same preview-then-commit shape
   (§6.3): proves the rows can be read on screen first, that confirming fetches
   the file (as a blob, through the token seam) and hands it to the browser to
   save, and that a preview alone downloads nothing. The object-URL plumbing is
   mocked, the requests are real. */

const PREVIEW = {
  sheets: [
    { name: 'إخوة', headers: ['م', 'الأسم'], rows: [['1', 'أحمد سالم']] },
    { name: 'أخوات', headers: ['م', 'الأسم'], rows: [['1', 'فاطمة علي']] },
  ],
  rowCount: 2,
};

const BASE: StubRoutes = {
  'GET /academic-years?page=1&pageSize=1': { items: [{ id: 1, hijriYear: 1447 }], total: 1, page: 1, pageSize: 1 },
  'GET /levels': [],
  'GET /exports/roster?academicYearId=1': new Blob(['roster-bytes']),
};

function renderExports(routes: StubRoutes = {}) {
  const http = stubHttpClient({ ...BASE, ...routes });
  const container = { auth: new AuthService(new AuthGateway(http), new MemoryTokenStore()), http };
  render(
    <DiProvider container={container}>
      <Provider store={makeStore(http)}>
        <ExportsPage />
      </Provider>
    </DiProvider>,
  );
  return http;
}

beforeEach(() => {
  // jsdom implements neither; the download helper needs both.
  URL.createObjectURL = vi.fn(() => 'blob:mock');
  URL.revokeObjectURL = vi.fn();
});

afterEach(cleanup);

describe('ExportsPage', () => {
  it('downloads the roster workbook from the export endpoint', async () => {
    const http = renderExports();
    const user = userEvent.setup();

    expect(await screen.findByText('كشوف الطلاب')).toBeDefined();
    // Two download buttons (roster, results); the roster is first.
    await user.click(screen.getAllByRole('button', { name: 'تنزيل' })[0]);

    await waitFor(() => expect(http.countOf('GET /exports/roster?academicYearId=1')).toBe(1));
    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it('shows the rows that would be exported, one table per gender sheet', async () => {
    renderExports({ 'GET /exports/roster/preview?academicYearId=1': PREVIEW });
    const user = userEvent.setup();
    await screen.findByText('كشوف الطلاب');

    await user.click(screen.getAllByRole('button', { name: 'معاينة' })[0]);

    // R3: the roster is produced separately per gender, so the preview is too.
    expect(await screen.findByText('إخوة')).toBeDefined();
    expect(screen.getByText('أخوات')).toBeDefined();
    expect(screen.getByText('أحمد سالم')).toBeDefined();
    expect(screen.getByText('فاطمة علي')).toBeDefined();
  });

  it('downloads nothing until the preview is confirmed', async () => {
    const http = renderExports({
      'GET /exports/roster/preview?academicYearId=1': PREVIEW,
    });
    const user = userEvent.setup();
    await screen.findByText('كشوف الطلاب');

    await user.click(screen.getAllByRole('button', { name: 'معاينة' })[0]);
    await screen.findByText('أحمد سالم');

    // Reading the rows is not exporting them — only the file is audited.
    expect(http.countOf('GET /exports/roster?academicYearId=1')).toBe(0);

    await user.click(screen.getByRole('button', { name: 'تنزيل' }));

    await waitFor(() => expect(http.countOf('GET /exports/roster?academicYearId=1')).toBe(1));
    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it('says so plainly when the chosen level would export nothing', async () => {
    renderExports({
      'GET /exports/roster/preview?academicYearId=1': { sheets: [], rowCount: 0 },
    });
    const user = userEvent.setup();
    await screen.findByText('كشوف الطلاب');

    await user.click(screen.getAllByRole('button', { name: 'معاينة' })[0]);

    expect(await screen.findByText('لا توجد صفوف للتصدير بهذا الاختيار.')).toBeDefined();
  });
});
