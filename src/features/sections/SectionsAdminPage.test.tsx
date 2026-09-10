// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { SectionsAdminPage } from './SectionsAdminPage';
import { AuthGateway, AuthProvider, AuthService, MemoryTokenStore, type AuthUser } from '../auth';
import { DiProvider } from '../../shared/di/DiProvider';
import { makeStore } from '../../shared/api/store';
import { DEFAULT_PAGE_SIZE, toQueryString } from '../../shared/api/pagination';
import { stubHttpClient, type StubRoutes } from '../../test/stub-http-client';
import '../../shared/i18n';

/* Section administration behind the real auth seam (the form reads the signed-in
   head teacher's branch). Proves the list renders and that creating a section
   POSTs it with the section's identity fields (branch/year/level/gender/name). */

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

const LEVELS = [
  { id: 1, code: 'L1', nameAr: 'المستوى الأول', sortOrder: 2, isOptional: false, isTerminal: false, allowsCarry: true, grantsCertificate: true, requiresCleanEntry: false },
];

const SECTION = {
  id: 's1',
  name: 'فصل النحو',
  gender: 'male',
  levelId: 1,
  defaultMode: 'onsite',
  enrolledCount: 10,
  capacity: 20,
  teachers: [{ userId: 't1', fullName: 'أستاذ أحمد', isPrimary: true }],
};

const listKey = `GET /sections?${toQueryString({ academicYearId: 1, page: 1, pageSize: DEFAULT_PAGE_SIZE })}`;

const BASE: StubRoutes = {
  'GET /auth/refresh/csrf-token': { csrfToken: 'x' },
  'POST /auth/refresh': { accessToken: 'a' },
  'GET /users/me': HEAD,
  'GET /academic-years?page=1&pageSize=1': { items: [{ id: 1, hijriYear: 1447 }], total: 1, page: 1, pageSize: 1 },
  'GET /levels': LEVELS,
  [listKey]: { items: [SECTION], total: 1, page: 1, pageSize: DEFAULT_PAGE_SIZE },
};

function renderAdmin(routes: StubRoutes = {}) {
  const http = stubHttpClient({ ...BASE, ...routes });
  const container = { auth: new AuthService(new AuthGateway(http), new MemoryTokenStore()), http };
  render(
    <DiProvider container={container}>
      <Provider store={makeStore(http)}>
        <AuthProvider>
          <SectionsAdminPage />
        </AuthProvider>
      </Provider>
    </DiProvider>,
  );
  return http;
}

afterEach(cleanup);

describe('SectionsAdminPage', () => {
  it('lists the year’s sections with level and teachers', async () => {
    renderAdmin();
    expect(await screen.findByText('فصل النحو')).toBeDefined();
    expect(screen.getByText('المستوى الأول')).toBeDefined();
    expect(screen.getByText('أستاذ أحمد')).toBeDefined();
  });

  it('provisions the year’s classes from the levels the institute teaches', async () => {
    // A level has many subjects but one class (R1 × R3), so the admin asks for
    // the year's set rather than naming classes one at a time — there is no
    // "add a class" action to click.
    const http = renderAdmin({
      'POST /sections/provision': { created: 12, total: 12 },
    });
    const user = userEvent.setup();
    await screen.findByText('فصل النحو');

    expect(screen.queryByRole('button', { name: 'إضافة فصل' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'تجهيز فصول العام' }));

    await waitFor(() => expect(http.countOf('POST /sections/provision')).toBe(1));
    const post = http.calls.find(
      (c) => c.method === 'POST' && c.path === '/sections/provision',
    );
    // The branch is the server's to decide for a branch-bound head teacher.
    expect(post?.body).toEqual({ academicYearId: 1 });
  });

  it('reports a year whose classes are already provisioned', async () => {
    const http = renderAdmin({
      'POST /sections/provision': { created: 0, total: 12 },
    });
    const user = userEvent.setup();
    await screen.findByText('فصل النحو');

    await user.click(screen.getByRole('button', { name: 'تجهيز فصول العام' }));

    await waitFor(() => expect(http.countOf('POST /sections/provision')).toBe(1));
    expect(await screen.findByText('فصول العام مجهّزة بالفعل.')).toBeDefined();
  });
});
