// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { EligibilityPage } from './EligibilityPage';
import { AuthGateway, AuthProvider, AuthService, MemoryTokenStore, type AuthUser } from '../auth';
import { DiProvider } from '../../shared/di/DiProvider';
import { makeStore } from '../../shared/api/store';
import { stubHttpClient, type StubRoutes } from '../../test/stub-http-client';
import '../../shared/i18n';

/* The teacher's core flow: an exam's eligible-students list, computed from
   attendance. Real store + RTK Query + DataTable against a stubbed transport —
   proves the list renders with the attendance exclusion labelled, that compute
   calls the persisting endpoint, and that the filter narrows to the printable
   eligible set. */

const ELIGIBLE = {
  id: 'a',
  enrollmentId: 'en1',
  studentName: 'أحمد سالم',
  studentCode: '2026-0001',
  isEligible: true,
  reasonCode: 'new',
  reasonNote: null,
  seatNo: null,
  overriddenBy: null,
};
const HELD_OUT = {
  ...ELIGIBLE,
  id: 'b',
  enrollmentId: 'en2',
  studentName: 'محمود علي',
  studentCode: '2026-0002',
  isEligible: false,
  reasonCode: 'low_attendance',
};

const EXAM = { examId: 'e1', subjectNameAr: 'النحو', maxScore: 100, passScore: 50, isLocked: false, rows: [] };

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
  'GET /exams/e1/scores': EXAM,
  'GET /exams/e1/eligibility': [ELIGIBLE, HELD_OUT],
};

function renderEligibility(routes: StubRoutes = {}) {
  const http = stubHttpClient({ ...BASE, ...routes });
  const container = { auth: new AuthService(new AuthGateway(http), new MemoryTokenStore()), http };
  render(
    <DiProvider container={container}>
      <Provider store={makeStore(http)}>
        <AuthProvider>
          <MemoryRouter initialEntries={['/exams/e1/eligibility']}>
            <Routes>
              <Route path="/exams/:examId/eligibility" element={<EligibilityPage />} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </Provider>
    </DiProvider>,
  );
  return http;
}

afterEach(cleanup);

describe('EligibilityPage', () => {
  it('lists eligible and held-out students, labelling the attendance exclusion', async () => {
    renderEligibility();

    expect(await screen.findByText('أحمد سالم')).toBeDefined();
    expect(screen.getByText('محمود علي')).toBeDefined();
    // The whole point of the flow: the student short on attendance is held out
    // with that specific reason, not a generic "ineligible".
    expect(screen.getByText('غياب متجاوز الحد')).toBeDefined();
  });

  it('computes (and persists) the list through the compute endpoint', async () => {
    const http = renderEligibility({ 'POST /exams/e1/eligibility/compute': { eligible: 1, ineligible: 1 } });
    await screen.findByText('أحمد سالم');

    await userEvent.click(screen.getByRole('button', { name: /إعادة الحساب/ }));

    await waitFor(() => expect(http.countOf('POST /exams/e1/eligibility/compute')).toBe(1));
  });

  it('filters down to the eligible students for printing', async () => {
    renderEligibility();
    await screen.findByText('محمود علي');

    // The stat tiles are the filter now; click the "eligible" tile (its name
    // starts with مستحق, distinct from the غير مستحق tile).
    await userEvent.click(screen.getByRole('button', { name: (name) => name.startsWith('مستحق') }));

    await waitFor(() => expect(screen.queryByText('محمود علي')).toBeNull());
    expect(screen.getByText('أحمد سالم')).toBeDefined();
  });

  it('lets the head teacher override a held-out verdict with a reason', async () => {
    const http = renderEligibility({ 'PATCH /exam-eligibility/b': { ...HELD_OUT, isEligible: true, overriddenBy: 'h1' } });
    const user = userEvent.setup();
    await screen.findByText('محمود علي');

    // The head teacher gets a 3-dots menu per row; the held-out student is the
    // second row. Open its menu, then the override item.
    await user.click(screen.getAllByRole('button', { name: 'إجراءات' })[1]);
    await user.click(screen.getByRole('menuitem', { name: 'تعديل القرار' }));
    await user.type(await screen.findByLabelText('سبب التعديل'), 'حالة خاصة موثّقة');
    await user.click(screen.getByRole('button', { name: 'حفظ' }));

    await waitFor(() => expect(http.countOf('PATCH /exam-eligibility/b')).toBe(1));
    const patch = http.calls.find((c) => c.method === 'PATCH' && c.path === '/exam-eligibility/b');
    expect((patch?.body as { reasonNote?: string } | undefined)?.reasonNote).toBe('حالة خاصة موثّقة');
  });
});
