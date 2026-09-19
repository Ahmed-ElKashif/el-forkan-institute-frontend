// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { Provider } from 'react-redux';
import { LevelsPage } from './LevelsPage';
import { AuthGateway, AuthProvider, AuthService, MemoryTokenStore, type AuthUser } from '../auth';
import { DiProvider } from '../../shared/di/DiProvider';
import { makeStore } from '../../shared/api/store';
import { toQueryString } from '../../shared/api/pagination';
import { stubHttpClient, type StubRoutes } from '../../test/stub-http-client';
import '../../shared/i18n';

/* Three de-bounces:

   1. One row per level, not per cohort. The screen a row opens has its own
      boys/girls filter, so listing each level twice made the same choice twice.
   2. Picking under Attendance/Scores opens that level's own task page and STAYS
      on the task route — it must not detour through the level hub.
   3. A level with no class this year is not listed. `GET /sections` is scoped
      server-side to a teacher's own classes, and that filter is what keeps a
      teacher out of levels they teach nothing in. */

const TEACHER: AuthUser = {
  id: 't1', fullName: 'أحمد', username: 'teacher', gender: 'male',
  role: 'teacher', branchId: 1, phone: '+201000000000', email: null, isActive: true,
};

const LEVEL = {
  id: 1, code: 'L1', nameAr: 'المستوى الأول', sortOrder: 2,
  isOptional: false, isTerminal: false, allowsCarry: true,
  grantsCertificate: false, requiresCleanEntry: false,
};
const UNTAUGHT_LEVEL = { ...LEVEL, id: 2, code: 'L2', nameAr: 'المستوى الثاني', sortOrder: 3 };

function cohort(id: string, gender: 'male' | 'female') {
  return {
    id, name: `فصل ${id}`, gender, levelId: 1, branchId: 1,
    defaultMode: 'onsite', enrolledCount: 12, capacity: null, teachers: [],
  };
}

const sectionsKey = `GET /sections?${toQueryString({ academicYearId: 1, page: 1, pageSize: 100 })}`;

const BASE: StubRoutes = {
  'GET /auth/refresh/csrf-token': { csrfToken: 'x' },
  'POST /auth/refresh': { accessToken: 'a' },
  'GET /users/me': TEACHER,
  'GET /levels': [LEVEL, UNTAUGHT_LEVEL],
  [`GET /academic-years?${toQueryString({ page: 1, pageSize: 100 })}`]: { items: [{ id: 1, hijriYear: 1447 }], total: 1, page: 1, pageSize: 100 },
  [sectionsKey]: {
    items: [cohort('s-girls', 'female'), cohort('s-boys', 'male')],
    total: 2, page: 1, pageSize: 100,
  },
};

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="path">{location.pathname + location.search}</div>;
}

function renderPicker(route: 'levels' | 'attendance' | 'scores') {
  const http = stubHttpClient(BASE);
  const container = { auth: new AuthService(new AuthGateway(http), new MemoryTokenStore()), http };
  render(
    <DiProvider container={container}>
      <Provider store={makeStore(http)}>
        <AuthProvider>
          <MemoryRouter initialEntries={[`/${route}`]}>
            <Routes>
              <Route
                path={`/${route}`}
                element={<LevelsPage linkTab={route === 'levels' ? undefined : route} />}
              />
              <Route path="*" element={<LocationProbe />} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </Provider>
    </DiProvider>,
  );
}

afterEach(cleanup);

describe('LevelsPage', () => {
  it('lists one row per level, not one per cohort', async () => {
    renderPicker('levels');
    // Two classes (إخوة and أخوات) of the same level are one row, and their
    // enrolments are summed rather than shown as two rows of 12.
    expect(await screen.findAllByText('المستوى الأول')).toHaveLength(1);
    expect(screen.getByText('24')).toBeDefined();
    expect(screen.queryByText('إخوة')).toBeNull();
    expect(screen.queryByText('أخوات')).toBeNull();
  });

  it('omits a level with no class this year, keeping a teacher out of it', async () => {
    renderPicker('levels');
    await screen.findByText('المستوى الأول');
    expect(screen.queryByText('المستوى الثاني')).toBeNull();
  });

  it.each(['attendance', 'scores'] as const)('picks a level into /%s/:id, not the hub', async (route) => {
    renderPicker(route);
    await userEvent.click(await screen.findByText('المستوى الأول'));
    // No `?gender=`: the destination's own filter defaults to إخوة.
    await waitFor(() => expect(screen.getByTestId('path').textContent).toBe(`/${route}/1`));
  });
});
