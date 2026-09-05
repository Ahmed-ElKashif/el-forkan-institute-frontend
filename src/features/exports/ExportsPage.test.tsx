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

/* The export counterpart to import: proves the roster button fetches the file
   from the export endpoint (as a blob, through the token seam) and hands it to
   the browser to save — the object-URL plumbing is mocked, the request is real. */

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
});
