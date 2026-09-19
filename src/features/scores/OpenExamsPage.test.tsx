// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { Provider } from 'react-redux';
import { OpenExamsPage } from './OpenExamsPage';
import { AuthGateway, AuthProvider, AuthService, MemoryTokenStore, type AuthUser } from '../auth';
import { DiProvider } from '../../shared/di/DiProvider';
import { makeStore } from '../../shared/api/store';
import { toQueryString } from '../../shared/api/pagination';
import { stubHttpClient, type StubRoutes } from '../../test/stub-http-client';
import '../../shared/i18n';

/* The de-bounces:
   1. The worklist asks the API for unlocked exams only — a locked exam has had
      its marks entered (R8), so listing one would be busywork.
   2. A row opens that exam's grid directly, with no level/cohort/day detour.
   3. A sat exam outranks an undated one, because only a sat exam owes marks. */

const TEACHER: AuthUser = {
  id: 't1', fullName: 'أحمد', username: 'teacher', gender: 'male',
  role: 'teacher', branchId: 1, phone: '+201000000000', email: null, isActive: true,
};

const LEVEL = {
  id: 1, code: 'L1', nameAr: 'المستوى الأول', sortOrder: 2,
  isOptional: false, isTerminal: false, allowsCarry: true,
  grantsCertificate: false, requiresCleanEntry: false,
};

function exam(id: string, subjectNameAr: string, scheduledAt: string | null) {
  return {
    id, subjectNameAr, levelId: 1, examType: 'term_1',
    gender: 'male', scheduledAt, isLocked: false, maxScore: 100, passScore: 50,
  };
}

const OPEN_EXAMS_ROUTE = `GET /exams?${toQueryString({ isLocked: 'false', page: 1, pageSize: 100 })}`;

const BASE: StubRoutes = {
  'GET /auth/refresh/csrf-token': { csrfToken: 'x' },
  'POST /auth/refresh': { accessToken: 'a' },
  'GET /users/me': TEACHER,
  'GET /levels': [LEVEL],
  [OPEN_EXAMS_ROUTE]: {
    items: [
      exam('e-undated', 'البلاغة', null),
      exam('e-older', 'النحو', '2026-03-01T09:00:00Z'),
      exam('e-newest', 'التفسير', '2026-05-01T09:00:00Z'),
    ],
    total: 3, page: 1, pageSize: 100,
  },
};

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="path">{location.pathname}</div>;
}

function renderWorklist() {
  const http = stubHttpClient(BASE);
  const container = { auth: new AuthService(new AuthGateway(http), new MemoryTokenStore()), http };
  render(
    <DiProvider container={container}>
      <Provider store={makeStore(http)}>
        <AuthProvider>
          <MemoryRouter initialEntries={['/scores']}>
            <Routes>
              <Route path="/scores" element={<OpenExamsPage />} />
              <Route path="*" element={<LocationProbe />} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </Provider>
    </DiProvider>,
  );
  return http;
}

afterEach(cleanup);

describe('OpenExamsPage — the exams still awaiting marks', () => {
  it('asks only for unlocked exams, across every level', async () => {
    const http = renderWorklist();
    await screen.findByText('التفسير');
    expect(http.countOf(OPEN_EXAMS_ROUTE)).toBe(1);
  });

  it('opens an exam grid directly, with no level or cohort detour', async () => {
    renderWorklist();
    await userEvent.click(await screen.findByText('النحو'));
    await waitFor(() => expect(screen.getByTestId('path').textContent).toBe('/scores/exams/e-older'));
  });

  it('puts the most recently sat exam first and the undated one last', async () => {
    renderWorklist();
    await screen.findByText('التفسير');
    const order = screen.getAllByRole('row').slice(1).map((row) => row.textContent ?? '');
    expect(order[0]).toContain('التفسير');
    expect(order[1]).toContain('النحو');
    expect(order[2]).toContain('البلاغة');
  });
});
