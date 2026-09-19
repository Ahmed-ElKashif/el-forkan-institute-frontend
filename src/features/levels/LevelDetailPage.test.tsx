// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { LevelDetailPage } from './LevelDetailPage';
import { AuthGateway, AuthProvider, AuthService, MemoryTokenStore, type AuthUser } from '../auth';
import { DiProvider } from '../../shared/di/DiProvider';
import { makeStore } from '../../shared/api/store';
import { DEFAULT_PAGE_SIZE, toQueryString } from '../../shared/api/pagination';
import { stubHttpClient, type StubRoutes } from '../../test/stub-http-client';
import '../../shared/i18n';

/* The level hub shows six levels, not twelve gendered classes, and a boys/girls
   filter switches which underlying cohort the roster reads. This proves the
   filter resolves the right section: the same level, two rosters. */

const HEAD: AuthUser = {
  id: 'h1', fullName: 'محمود', username: 'head', gender: 'male',
  role: 'head_teacher', branchId: 1, phone: '+201000000000', email: null, isActive: true,
};

const LEVEL = {
  id: 1, code: 'L1', nameAr: 'المستوى الأول', sortOrder: 2,
  isOptional: false, isTerminal: false, allowsCarry: true,
  grantsCertificate: false, requiresCleanEntry: false,
};

const SECTION = (id: string, gender: 'male' | 'female') => ({
  id, name: `المستوى الأول — ${gender === 'male' ? 'إخوة' : 'أخوات'}`,
  gender, levelId: 1, branchId: 1, academicYearId: 1,
  defaultMode: 'onsite', capacity: 20, enrolledCount: 1, teachers: [],
});

const yearKey = `GET /academic-years?${toQueryString({ page: 1, pageSize: 100 })}`;
const sectionsKey = `GET /sections?${toQueryString({ academicYearId: 1, page: 1, pageSize: 100, branchId: undefined })}`;
const rosterKey = (sectionId: string) =>
  `GET /enrollments?${toQueryString({ sectionId, page: 1, pageSize: DEFAULT_PAGE_SIZE, status: 'active' })}`;

function roster(studentName: string) {
  return {
    items: [{ id: `e-${studentName}`, studentId: 's', studentName, entryType: 'new', status: 'active', isHistorical: false }],
    total: 1, page: 1, pageSize: DEFAULT_PAGE_SIZE,
  };
}

const BASE: StubRoutes = {
  'GET /auth/refresh/csrf-token': { csrfToken: 'x' },
  'POST /auth/refresh': { accessToken: 'a' },
  'GET /users/me': HEAD,
  'GET /levels': [LEVEL],
  [yearKey]: { items: [{ id: 1, hijriYear: 1447, startsOn: '2025-08-01', endsOn: '2026-06-01', status: 'active', terms: [] }], total: 1, page: 1, pageSize: 1 },
  [sectionsKey]: { items: [SECTION('sec-boys', 'male'), SECTION('sec-girls', 'female')], total: 2, page: 1, pageSize: 100 },
  'GET /sections/sec-boys': SECTION('sec-boys', 'male'),
  'GET /sections/sec-girls': SECTION('sec-girls', 'female'),
  [rosterKey('sec-boys')]: roster('أحمد سالم'),
  [rosterKey('sec-girls')]: roster('فاطمة علي'),
};

function renderLevel(entry: string) {
  const http = stubHttpClient(BASE);
  const container = { auth: new AuthService(new AuthGateway(http), new MemoryTokenStore()), http };
  render(
    <DiProvider container={container}>
      <Provider store={makeStore(http)}>
        <AuthProvider>
          <MemoryRouter initialEntries={[entry]}>
            <Routes>
              <Route path="/levels/:levelId" element={<LevelDetailPage />} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </Provider>
    </DiProvider>,
  );
}

afterEach(cleanup);

describe('LevelDetailPage — gender filter resolves the cohort', () => {
  it('shows the boys cohort roster by default', async () => {
    renderLevel('/levels/1');
    expect(await screen.findByText('أحمد سالم')).toBeDefined();
  });

  it('switches to the girls cohort roster when أخوات is chosen', async () => {
    renderLevel('/levels/1');
    await screen.findByText('أحمد سالم');

    await userEvent.click(screen.getByRole('button', { name: 'أخوات' }));

    expect(await screen.findByText('فاطمة علي')).toBeDefined();
  });
});
