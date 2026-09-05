// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { PromotionPage } from './PromotionPage';
import type { PromotionRow } from './promotion.model';
import { makeStore } from '../../shared/api/store';
import { stubHttpClient, type StubRoutes } from '../../test/stub-http-client';
import '../../shared/i18n';

/* Proves the F6 capstone: a preview lists each enrolment's §4.3 decision, and
   confirming posts exactly the non-blocked enrolments (a blocked row is never
   written). Real store and DataTable against a stub. */

const ROWS: PromotionRow[] = [
  { enrollmentId: 'e1', studentId: 's1', studentName: 'أحمد سالم', levelId: 1, levelCode: 'L1', failedSubjects: [], decision: 'promote', blocker: null },
  {
    enrollmentId: 'e2',
    studentId: 's2',
    studentName: 'خالد إبراهيم',
    levelId: 1,
    levelCode: 'L1',
    failedSubjects: [{ subjectId: 1, nameAr: 'النحو', isMandatory: true }],
    decision: 'repeat',
    blocker: null,
  },
  { enrollmentId: 'e3', studentId: 's3', studentName: 'عمر', levelId: 1, levelCode: 'L1', failedSubjects: [], decision: 'promote', blocker: 'قاعدة ترقية مفقودة' },
];

const ROUTES: StubRoutes = {
  'GET /academic-years?page=1&pageSize=1': { items: [{ id: 1, hijriYear: 1447, terms: [] }], total: 1, page: 1, pageSize: 1 },
  'GET /academic-years?page=1&pageSize=100': { items: [{ id: 1, hijriYear: 1447, terms: [] }], total: 1, page: 1, pageSize: 100 },
  'POST /promotion/preview': ROWS,
  'POST /promotion/confirm': { applied: 2, enrollmentsCreated: 0, carriesWritten: 0, notMovedForward: 2 },
};

function renderPromotion() {
  const http = stubHttpClient(ROUTES);
  render(
    <Provider store={makeStore(http)}>
      <PromotionPage />
    </Provider>,
  );
  return http;
}

afterEach(cleanup);

describe('PromotionPage', () => {
  it('previews decisions and confirms only the non-blocked enrolments', async () => {
    const http = renderPromotion();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'معاينة' }));

    // The preview lists each student's decision, including the blocked row.
    await screen.findByText('أحمد سالم');
    expect(screen.getByText('قاعدة ترقية مفقودة')).toBeDefined();

    await user.click(screen.getByRole('button', { name: 'تأكيد الترقية' }));

    await waitFor(() => expect(http.countOf('POST /promotion/confirm')).toBe(1));
    const confirm = http.calls.find((c) => c.method === 'POST' && c.path === '/promotion/confirm');
    const body = confirm?.body as { enrollmentIds?: string[] } | undefined;
    expect(body?.enrollmentIds).toEqual(['e1', 'e2']);
  });
});
