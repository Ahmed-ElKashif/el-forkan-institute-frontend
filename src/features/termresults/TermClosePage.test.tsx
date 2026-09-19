// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { Provider } from 'react-redux';
import { TermClosePage } from './TermClosePage';
import { AuthGateway, AuthProvider, AuthService, MemoryTokenStore, type AuthUser } from '../auth';
import { DiProvider } from '../../shared/di/DiProvider';
import { makeStore } from '../../shared/api/store';
import { toQueryString } from '../../shared/api/pagination';
import { stubHttpClient, type StubRoutes } from '../../test/stub-http-client';
import '../../shared/i18n';

/* Term close judges each class on whether its marks are frozen, and the trap is
   R3: an exam with no gender is ONE sitting both cohorts attend. Counting it for
   only one of them would show a class as ready while a paper of its own was
   still open. The fixture below gives the boys an extra unlocked paper, so the
   two cohorts must land on different verdicts from the same exam list. */

const HEAD: AuthUser = {
  id: 'h1', fullName: 'محمود', username: 'head', gender: 'male',
  role: 'head_teacher', branchId: 1, phone: '+201000000000', email: null, isActive: true,
};

const TERM = { id: 5, academicYearId: 1, termNumber: 1, startsOn: '2026-08-01', endsOn: '2027-01-01', examStartsOn: null, examEndsOn: null, status: 'active' };

function cohort(id: string, gender: 'male' | 'female') {
  return { id, name: `فصل ${id}`, gender, levelId: 1, branchId: 1, defaultMode: 'onsite', enrolledCount: 10, capacity: null, teachers: [] };
}

function exam(id: string, gender: string | null, isLocked: boolean) {
  return { id, subjectNameAr: 'النحو', levelId: 1, examType: 'term_1', gender, scheduledAt: null, isLocked, maxScore: 100, passScore: 50 };
}

const yearsKey = `GET /academic-years?${toQueryString({ page: 1, pageSize: 100 })}`;
const sectionsKey = `GET /sections?${toQueryString({ academicYearId: 1, page: 1, pageSize: 100 })}`;
const examsKey = `GET /exams?${toQueryString({ page: 1, pageSize: 100, termId: 5 })}`;

const BASE: StubRoutes = {
  'GET /auth/refresh/csrf-token': { csrfToken: 'x' },
  'POST /auth/refresh': { accessToken: 'a' },
  'GET /users/me': HEAD,
  'GET /levels': [{ id: 1, code: 'L1', nameAr: 'المستوى الأول', sortOrder: 1, isOptional: false, isTerminal: false, allowsCarry: true, grantsCertificate: false, requiresCleanEntry: false }],
  [yearsKey]: {
    items: [{ id: 1, hijriYear: 1447, startsOn: '2026-08-01', endsOn: '2027-06-01', status: 'active', terms: [TERM] }],
    total: 1, page: 1, pageSize: 100,
  },
  [sectionsKey]: { items: [cohort('s-boys', 'male'), cohort('s-girls', 'female')], total: 2, page: 1, pageSize: 100 },
  // A shared, locked sitting both cohorts attend, plus an unlocked boys-only one.
  [examsKey]: { items: [exam('ex-shared', null, true), exam('ex-boys', 'male', false)], total: 2, page: 1, pageSize: 100 },
};

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="path">{location.pathname}</div>;
}

function renderTermClose() {
  const http = stubHttpClient(BASE);
  const container = { auth: new AuthService(new AuthGateway(http), new MemoryTokenStore()), http };
  render(
    <DiProvider container={container}>
      <Provider store={makeStore(http)}>
        <AuthProvider>
          <MemoryRouter initialEntries={['/term-close']}>
            <Routes>
              <Route path="/term-close" element={<TermClosePage />} />
              <Route path="*" element={<LocationProbe />} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </Provider>
    </DiProvider>,
  );
}

afterEach(cleanup);

describe('TermClosePage', () => {
  it('counts a shared sitting for both cohorts, so only the boys read as pending', async () => {
    renderTermClose();

    const rows = await screen.findAllByRole('row');
    const boys = rows.find((row) => row.textContent?.includes('إخوة'));
    const girls = rows.find((row) => row.textContent?.includes('أخوات'));

    // Boys sit both papers and one is open; girls sit only the shared, locked one.
    expect(boys?.textContent).toContain('درجات لم تُقفل');
    expect(girls?.textContent).toContain('جاهز للاعتماد');
  });

  it('opens a class’s term results, the screen nothing used to link to', async () => {
    renderTermClose();
    await userEvent.click(await screen.findByText('أخوات'));
    await waitFor(() => expect(screen.getByTestId('path').textContent).toBe('/term-results/s-girls/5'));
  });
});
