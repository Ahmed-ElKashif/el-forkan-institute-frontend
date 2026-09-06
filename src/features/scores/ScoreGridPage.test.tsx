// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ScoreGridPage } from './ScoreGridPage';
import { AuthGateway, AuthProvider, AuthService, MemoryTokenStore, type AuthUser } from '../auth';
import { DiProvider } from '../../shared/di/DiProvider';
import { makeStore } from '../../shared/api/store';
import { stubHttpClient, type StubRoutes } from '../../test/stub-http-client';
import '../../shared/i18n';

/* Proves the two F3 exit criteria that carry risk: an over-max score is refused
   with the rule stated (not "invalid"), and a locked exam is read-only with the
   correction path available to the head teacher — driven through the real auth
   seam, store and DataTable against a stub. */

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
const TEACHER: AuthUser = { ...HEAD, id: 't1', username: 'teacher1', role: 'teacher' };

const ROW = {
  enrollmentId: 'e1',
  studentName: 'أحمد سالم',
  studentCode: '2026-0001',
  resultId: 'r1',
  score: null,
  isAbsent: false,
  result: 'pending',
};
const gridOf = (isLocked: boolean) => ({
  examId: 'exam1',
  subjectNameAr: 'النحو',
  maxScore: 100,
  passScore: 50,
  isLocked,
  rows: [ROW],
});

/** A working refresh + /users/me, so `AuthProvider.restore()` lands on `user`. */
function authRoutes(user: AuthUser): StubRoutes {
  return {
    'GET /auth/refresh/csrf-token': { csrfToken: 'x' },
    'POST /auth/refresh': { accessToken: 'a' },
    'GET /users/me': user,
  };
}

function renderScores(user: AuthUser, routes: StubRoutes) {
  const http = stubHttpClient({ ...authRoutes(user), ...routes });
  const container = { auth: new AuthService(new AuthGateway(http), new MemoryTokenStore()), http };
  render(
    <DiProvider container={container}>
      <Provider store={makeStore(http)}>
        <AuthProvider>
          <MemoryRouter initialEntries={['/scores/exams/exam1']}>
            <Routes>
              <Route path="/scores/exams/:examId" element={<ScoreGridPage />} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </Provider>
    </DiProvider>,
  );
  return http;
}

afterEach(cleanup);

describe('ScoreGridPage', () => {
  it('refuses an over-max score with the rule stated and disables the save', async () => {
    renderScores(TEACHER, { 'GET /exams/exam1/scores': gridOf(false) });
    await screen.findByText('النحو');

    await userEvent.type(screen.getByRole('textbox', { name: 'الدرجة' }), '150');

    expect(screen.getByText(/تتجاوز الحد الأقصى/)).toBeDefined();
    const save = screen.getByRole('button', { name: 'حفظ الدرجات' }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
  });

  it('shows a locked exam read-only with the head teacher correction path', async () => {
    renderScores(HEAD, { 'GET /exams/exam1/scores': gridOf(true) });
    await screen.findByText('النحو');

    // Correction is offered only after restore() resolves the head-teacher role,
    // now via the row's 3-dots menu.
    await userEvent.click(await screen.findByRole('button', { name: 'إجراءات' }));
    expect(screen.getByRole('menuitem', { name: 'تصحيح' })).toBeDefined();
    // Locked: there is no bulk save control at all.
    expect(screen.queryByRole('button', { name: 'حفظ الدرجات' })).toBeNull();
  });
});
