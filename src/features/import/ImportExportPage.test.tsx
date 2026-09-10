// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ImportExportPage } from './ImportExportPage';
import { AuthGateway, AuthProvider, AuthService, MemoryTokenStore, type AuthUser } from '../auth';
import { DiProvider } from '../../shared/di/DiProvider';
import { makeStore } from '../../shared/api/store';
import { stubHttpClient, type StubRoutes } from '../../test/stub-http-client';
import '../../shared/i18n';

/* Import and export are the same workbook travelling in opposite directions, so
   they share a screen. These prove both halves are reachable, and that the
   export tab opens directly from the URL — which is where the retired /exports
   route now redirects. */

const HEAD: AuthUser = {
  id: 'h1',
  fullName: 'محمود عبد الله',
  username: 'headteacher',
  gender: 'male',
  role: 'head_teacher',
  branchId: 1,
  phone: '+201000000000',
  email: null,
  isActive: true,
};

const BASE: StubRoutes = {
  'GET /auth/refresh/csrf-token': { csrfToken: 'x' },
  'POST /auth/refresh': { accessToken: 'a' },
  'GET /users/me': HEAD,
  'GET /academic-years?page=1&pageSize=1': { items: [{ id: 1, hijriYear: 1447 }], total: 1, page: 1, pageSize: 1 },
  'GET /levels': [],
  'GET /sections?academicYearId=1&page=1&pageSize=100&branchId=1': {
    items: [],
    total: 0,
    page: 1,
    pageSize: 100,
  },
};

function renderScreen(entry = '/imports') {
  const http = stubHttpClient(BASE);
  const container = { auth: new AuthService(new AuthGateway(http), new MemoryTokenStore()), http };
  render(
    <DiProvider container={container}>
      <Provider store={makeStore(http)}>
        <AuthProvider>
          <MemoryRouter initialEntries={[entry]}>
            <ImportExportPage />
          </MemoryRouter>
        </AuthProvider>
      </Provider>
    </DiProvider>,
  );
  return http;
}

beforeEach(() => {
  // jsdom implements neither; the export tab's download helper needs both.
  URL.createObjectURL = vi.fn(() => 'blob:mock');
  URL.revokeObjectURL = vi.fn();
});

afterEach(cleanup);

describe('ImportExportPage', () => {
  it('opens on the import side, with the export side one tab away', async () => {
    renderScreen();

    expect(await screen.findByRole('tab', { name: 'استيراد', selected: true })).toBeDefined();
    expect(screen.getByRole('tab', { name: 'تصدير' })).toBeDefined();
  });

  it('switches to the export side', async () => {
    renderScreen();
    const user = userEvent.setup();
    await screen.findByRole('tab', { name: 'استيراد' });

    await user.click(screen.getByRole('tab', { name: 'تصدير' }));

    expect(await screen.findByRole('tab', { name: 'تصدير', selected: true })).toBeDefined();
  });

  it('opens the export side directly from the URL', async () => {
    // Where the retired /exports destination redirects, so it must work on the
    // first paint rather than only after a click.
    renderScreen('/imports?tab=export');

    expect(await screen.findByRole('tab', { name: 'تصدير', selected: true })).toBeDefined();
  });
});
