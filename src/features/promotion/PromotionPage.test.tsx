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

/* Proves the F6 capstone: a preview lists each enrolment's §4.3 decision, a
   human may disagree with one in writing, and confirming posts exactly the
   non-blocked enrolments (a blocked row is never written). Real store and
   DataTable against a stub. */

const ROWS: PromotionRow[] = [
  { enrollmentId: 'e1', studentId: 's1', studentName: 'أحمد سالم', levelId: 1, levelCode: 'L1', failedSubjects: [], decision: 'promote', computedDecision: 'promote', override: null, blocker: null },
  {
    enrollmentId: 'e2',
    studentId: 's2',
    studentName: 'خالد إبراهيم',
    levelId: 1,
    levelCode: 'L1',
    failedSubjects: [{ subjectId: 1, nameAr: 'النحو', isMandatory: true }],
    decision: 'repeat',
    computedDecision: 'repeat',
    override: null,
    blocker: null,
  },
  { enrollmentId: 'e3', studentId: 's3', studentName: 'عمر', levelId: 1, levelCode: 'L1', failedSubjects: [], decision: 'promote', computedDecision: 'promote', override: null, blocker: 'قاعدة ترقية مفقودة' },
];

const ROUTES: StubRoutes = {
  'GET /academic-years?page=1&pageSize=1': { items: [{ id: 1, hijriYear: 1447, terms: [] }], total: 1, page: 1, pageSize: 1 },
  'GET /academic-years?page=1&pageSize=100': { items: [{ id: 1, hijriYear: 1447, terms: [] }], total: 1, page: 1, pageSize: 100 },
  'POST /promotion/preview': ROWS,
  'POST /promotion/confirm': { applied: 2, enrollmentsCreated: 0, carriesWritten: 0, notMovedForward: 2 },
};

function renderPromotion(extra: StubRoutes = {}) {
  const http = stubHttpClient({ ...ROUTES, ...extra });
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

  it('records a decision override with its reason, then re-reads the preview', async () => {
    const http = renderPromotion({
      'PUT /promotion/overrides/e1': { decision: 'repeat', afterMakeup: false },
    });
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'معاينة' }));
    await screen.findByText('أحمد سالم');

    await user.click(screen.getAllByRole('button', { name: 'إجراءات' })[0]);
    await user.click(await screen.findByRole('menuitem', { name: 'تعديل القرار' }));

    await user.type(screen.getByLabelText('سبب التعديل'), 'غياب متكرر');
    await user.click(screen.getByRole('button', { name: 'حفظ' }));

    await waitFor(() => expect(http.countOf('PUT /promotion/overrides/e1')).toBe(1));
    const put = http.calls.find((c) => c.method === 'PUT');
    expect(put?.body).toEqual({
      decision: 'promote',
      afterMakeup: false,
      reason: 'غياب متكرر',
    });
    // Re-read rather than patch in place: the override only counts if it
    // survives the replay `confirm` performs.
    await waitFor(() => expect(http.countOf('POST /promotion/preview')).toBe(2));
  });

  it('will not save an override without a real reason', async () => {
    const http = renderPromotion();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'معاينة' }));
    await screen.findByText('أحمد سالم');

    await user.click(screen.getAllByRole('button', { name: 'إجراءات' })[0]);
    await user.click(await screen.findByRole('menuitem', { name: 'تعديل القرار' }));

    // Two characters is not a reason; the audit log is the whole point.
    await user.type(screen.getByLabelText('سبب التعديل'), 'لا');

    expect(screen.getByRole('button', { name: 'حفظ' })).toHaveProperty('disabled', true);
    expect(http.countOf('PUT /promotion/overrides/e1')).toBe(0);
  });

  it('offers no decision menu on a blocked row', async () => {
    // `confirm` refuses blocked rows, so an editable decision there would be a
    // verdict the run will not honour.
    renderPromotion();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'معاينة' }));
    await screen.findByText('عمر');

    // Three rows, but only the two confirmable ones carry an actions menu.
    expect(screen.getAllByRole('button', { name: 'إجراءات' })).toHaveLength(2);
  });
});
