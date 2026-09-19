// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { PromotionPage } from './PromotionPage';
import { AuthGateway, AuthProvider, AuthService, MemoryTokenStore, type AuthUser } from '../auth';
import { DiProvider } from '../../shared/di/DiProvider';
import { makeStore } from '../../shared/api/store';
import { toQueryString } from '../../shared/api/pagination';
import { stubHttpClient, type StubRoutes } from '../../test/stub-http-client';
import '../../shared/i18n';

/* Promotion is one run across the whole institute, and the three things that
   silently changed what it wrote are now explicit. These prove each of them:

   - the run is NOT scoped to a level unless one is chosen (no `levelId`);
   - unlocked marks BLOCK the run rather than warning about it, until the head
     teacher acknowledges — a decision taken over a mark that can still move is
     the failure the gate exists for;
   - the round is a named choice, and picking the makeup round is what sends
     `afterMakeup` (§4.3 decides differently either side of it). */

const HEAD: AuthUser = {
  id: 'h1', fullName: 'محمود', username: 'head', gender: 'male',
  role: 'head_teacher', branchId: 1, phone: '+201000000000', email: null, isActive: true,
};

const PREVIEW_ROW = {
  enrollmentId: 'enr-1', studentId: 'stu-1', studentName: 'سالم أحمد',
  levelId: 2, levelCode: 'L2', failedSubjects: [], decision: 'promote',
  computedDecision: 'promote', override: null, blocker: null,
  finalDecision: null, decidedAt: null,
  pendingCarries: [{ subjectId: 7, nameAr: 'النحو', originLevelCode: 'L1' }],
};

function level(id: number, code: string, nameAr: string) {
  return { id, code, nameAr, sortOrder: id, isOptional: false, isTerminal: false, allowsCarry: true, grantsCertificate: false, requiresCleanEntry: false };
}

const yearsKey = `GET /academic-years?${toQueryString({ page: 1, pageSize: 100 })}`;
// No level chosen, so readiness asks for every unlocked exam in the institute.
const openExamsKey = `GET /exams?${toQueryString({ isLocked: 'false', page: 1, pageSize: 100 })}`;

const BASE: StubRoutes = {
  'GET /auth/refresh/csrf-token': { csrfToken: 'x' },
  'POST /auth/refresh': { accessToken: 'a' },
  'GET /users/me': HEAD,
  'GET /levels': [level(1, 'L1', 'الأول'), level(2, 'L2', 'الثاني')],
  [yearsKey]: {
    items: [
      { id: 1, hijriYear: 1447, startsOn: '2026-08-01', endsOn: '2027-06-01', status: 'active', terms: [] },
      { id: 2, hijriYear: 1448, startsOn: '2027-08-01', endsOn: '2028-06-01', status: 'planned', terms: [] },
    ],
    total: 2, page: 1, pageSize: 100,
  },
  // One unlocked exam → the gate is closed until acknowledged.
  [openExamsKey]: {
    items: [{ id: 'ex-1', subjectNameAr: 'النحو', levelId: 2, examType: 'term_1', isLocked: false, gender: null, scheduledAt: null, maxScore: 100, passScore: 50 }],
    total: 1, page: 1, pageSize: 100,
  },
  'POST /promotion/preview': [PREVIEW_ROW],
};

function renderPromotion() {
  const http = stubHttpClient(BASE);
  const container = { auth: new AuthService(new AuthGateway(http), new MemoryTokenStore()), http };
  render(
    <DiProvider container={container}>
      <Provider store={makeStore(http)}>
        <AuthProvider>
          <MemoryRouter>
            <PromotionPage />
          </MemoryRouter>
        </AuthProvider>
      </Provider>
    </DiProvider>,
  );
  return http;
}

function previewButton(): HTMLButtonElement {
  return screen.getByRole('button', { name: 'معاينة' }) as HTMLButtonElement;
}

async function acknowledgeUnlockedMarks() {
  await userEvent.click(await screen.findByRole('checkbox'));
}

afterEach(cleanup);

describe('PromotionPage', () => {
  it('blocks the run while marks are unlocked, and releases it on acknowledgement', async () => {
    renderPromotion();
    await waitFor(() => expect(previewButton().disabled).toBe(true));

    await acknowledgeUnlockedMarks();
    expect(previewButton().disabled).toBe(false);
  });

  it('runs across every level — no levelId — and shows carried-forward subjects', async () => {
    const http = renderPromotion();
    await acknowledgeUnlockedMarks();
    await userEvent.click(previewButton());

    await waitFor(() => expect(http.countOf('POST /promotion/preview')).toBe(1));
    const preview = http.calls.find((c) => c.method === 'POST' && c.path === '/promotion/preview');
    expect(preview?.body).toEqual({ academicYearId: 1, afterMakeup: false });

    // The carried subject from the earlier level is surfaced in the preview.
    expect(await screen.findByText(/النحو/)).toBeDefined();
  });

  it('sends the makeup round only when that round is chosen', async () => {
    const http = renderPromotion();
    await acknowledgeUnlockedMarks();
    await userEvent.click(screen.getByText('الدور الثاني (بعد الإعادة)'));
    await userEvent.click(previewButton());

    await waitFor(() => expect(http.countOf('POST /promotion/preview')).toBe(1));
    const preview = http.calls.find((c) => c.method === 'POST' && c.path === '/promotion/preview');
    expect(preview?.body).toMatchObject({ afterMakeup: true });
  });
});
