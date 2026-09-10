// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { SectionDetailPage } from './SectionDetailPage';
import { AuthGateway, AuthProvider, AuthService, MemoryTokenStore, type AuthUser } from '../auth';
import { DiProvider } from '../../shared/di/DiProvider';
import { makeStore } from '../../shared/api/store';
import { DEFAULT_PAGE_SIZE, toQueryString } from '../../shared/api/pagination';
import { stubHttpClient, type StubRoutes } from '../../test/stub-http-client';
import '../../shared/i18n';

/* A class is one destination with three views of itself. These prove the tabs
   render from the class read, that the active tab is carried in `?tab=` so a
   retired /timetable link can redirect into it, and that each tab only fetches
   what it needs — the timetable is not read until its tab is opened. */

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

const SECTION = {
  id: 's1',
  name: 'المستوى الأول — إخوة',
  gender: 'male',
  levelId: 1,
  branchId: 1,
  academicYearId: 1,
  defaultMode: 'onsite',
  capacity: 20,
  enrolledCount: 2,
  teachers: [{ userId: 't1', fullName: 'أستاذ أحمد', isPrimary: true }],
};

const rosterKey = `GET /enrollments?${toQueryString({
  sectionId: 's1',
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
})}`;

const BASE: StubRoutes = {
  'GET /auth/refresh/csrf-token': { csrfToken: 'x' },
  'POST /auth/refresh': { accessToken: 'a' },
  'GET /users/me': HEAD,
  'GET /sections/s1': SECTION,
  [rosterKey]: {
    items: [
      {
        id: 'e1',
        studentId: 'stu1',
        studentName: 'أحمد سالم',
        studentCode: '2026-0007',
        entryType: 'new',
        status: 'active',
        isHistorical: false,
      },
    ],
    total: 1,
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
  },
  'GET /sections/s1/timetable': [],
  'GET /subjects/options': [],
  'GET /users/teachers': [],
};

function renderDetail(initialEntry: string, routes: StubRoutes = {}) {
  const http = stubHttpClient({ ...BASE, ...routes });
  const container = { auth: new AuthService(new AuthGateway(http), new MemoryTokenStore()), http };
  render(
    <DiProvider container={container}>
      <Provider store={makeStore(http)}>
        <AuthProvider>
          <MemoryRouter initialEntries={[initialEntry]}>
            <Routes>
              <Route path="/sections/:id" element={<SectionDetailPage />} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </Provider>
    </DiProvider>,
  );
  return http;
}

afterEach(cleanup);

describe('SectionDetailPage', () => {
  it('names the class and offers its three views', async () => {
    renderDetail('/sections/s1');

    expect(await screen.findByText('المستوى الأول — إخوة')).toBeDefined();
    expect(screen.getByRole('tab', { name: /الطلاب/ })).toBeDefined();
    expect(screen.getByRole('tab', { name: /الجدول/ })).toBeDefined();
    expect(screen.getByRole('tab', { name: /المعلّمون/ })).toBeDefined();
  });

  it('opens on the roster and lists the class’s students', async () => {
    renderDetail('/sections/s1');

    expect(await screen.findByText('أحمد سالم')).toBeDefined();
    expect(screen.getByText('2026-0007')).toBeDefined();
  });

  it('reads the timetable only once its tab is opened', async () => {
    const http = renderDetail('/sections/s1');
    const user = userEvent.setup();
    await screen.findByText('أحمد سالم');

    // The roster is showing, so nothing has asked for the weekly grid yet.
    expect(http.countOf('GET /sections/s1/timetable')).toBe(0);

    await user.click(screen.getByRole('tab', { name: /الجدول/ }));

    await waitFor(() => expect(http.countOf('GET /sections/s1/timetable')).toBe(1));
  });

  it('lands directly on the tab named in the URL', async () => {
    // This is what /timetable/:id redirects to, so it has to work on first paint.
    renderDetail('/sections/s1?tab=teachers');

    expect(await screen.findByText('أستاذ أحمد')).toBeDefined();
  });

  it('falls back to the roster when the URL names a tab that does not exist', async () => {
    // `?tab=` is user-editable, so an unknown value must not blank the screen.
    renderDetail('/sections/s1?tab=nonsense');

    expect(await screen.findByText('أحمد سالم')).toBeDefined();
  });

  it('shows a not-found state for a class it cannot reach', async () => {
    renderDetail('/sections/s1', { 'GET /sections/s1': () => { throw new Error('nope'); } });

    expect(await screen.findByText('الفصل غير موجود')).toBeDefined();
  });
});
