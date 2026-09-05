// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { TermResultsPage } from './TermResultsPage';
import { AuthGateway, AuthProvider, AuthService, MemoryTokenStore, type AuthUser } from '../auth';
import { DiProvider } from '../../shared/di/DiProvider';
import { makeStore } from '../../shared/api/store';
import { stubHttpClient, type StubRoutes } from '../../test/stub-http-client';
import '../../shared/i18n';

/* Term results: compute the standing from entered scores (both roles), then the
   head teacher finalizes to lock it. Proves the compute renders the roster and
   that finalize hits the persisting endpoint. */

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

const ROW = {
  enrollmentId: 'e1',
  studentName: 'أحمد سالم',
  totalScore: 180,
  maxTotal: 200,
  percentage: 90,
  subjectsFailed: 0,
  mandatoryFailed: 0,
  result: 'pass',
  decision: null,
  finalizedAt: null,
};

const BASE: StubRoutes = {
  'GET /auth/refresh/csrf-token': { csrfToken: 'x' },
  'POST /auth/refresh': { accessToken: 'a' },
  'GET /users/me': HEAD,
  'GET /sections/sec1': { id: 'sec1', name: 'فصل النحو', gender: 'male', levelId: 1, branchId: 1, academicYearId: 1 },
  'POST /sections/sec1/term-results/10/compute': [ROW],
  'POST /sections/sec1/term-results/10/finalize': [{ ...ROW, finalizedAt: '2026-09-04' }],
};

function renderPage(routes: StubRoutes = {}) {
  const http = stubHttpClient({ ...BASE, ...routes });
  const container = { auth: new AuthService(new AuthGateway(http), new MemoryTokenStore()), http };
  render(
    <DiProvider container={container}>
      <Provider store={makeStore(http)}>
        <AuthProvider>
          <MemoryRouter initialEntries={['/term-results/sec1/10']}>
            <Routes>
              <Route path="/term-results/:sectionId/:termId" element={<TermResultsPage />} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </Provider>
    </DiProvider>,
  );
  return http;
}

afterEach(cleanup);

describe('TermResultsPage', () => {
  it('computes the standing then lets the head teacher finalize it', async () => {
    const http = renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'احسب الحصيلة' }));
    expect(await screen.findByText('أحمد سالم')).toBeDefined();
    expect(http.countOf('POST /sections/sec1/term-results/10/compute')).toBe(1);

    await user.click(screen.getByRole('button', { name: 'اعتماد الحصيلة' }));
    await waitFor(() => expect(http.countOf('POST /sections/sec1/term-results/10/finalize')).toBe(1));
  });
});
