// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ScoresTab } from './ScoresTab';
import type { SectionDetail } from '../sections';
import { makeStore } from '../../shared/api/store';
import { toQueryString } from '../../shared/api/pagination';
import { stubHttpClient, type StubRoutes } from '../../test/stub-http-client';
import '../../shared/i18n';

/* The scores tab is date-first: it defaults to the latest exam day and lists
   only that day's exams. Creation is head-teacher-only, so a teacher sees no
   create button (the API gates it too). */

const SECTION: SectionDetail = {
  id: 'sec-boys', name: 'المستوى الأول — إخوة', gender: 'male', levelId: 1,
  branchId: 1, academicYearId: 10, defaultMode: 'onsite', capacity: 20, enrolledCount: 3, teachers: [],
};

const YEAR = { id: 10, hijriYear: 1447, startsOn: '2026-08-01', endsOn: '2027-06-01', status: 'active', terms: [{ id: 5, academicYearId: 10, termNumber: 1, startsOn: '2026-08-01', endsOn: '2027-01-01', examStartsOn: null, examEndsOn: null, status: 'active' }] };

const exam = (id: string, subject: string, iso: string) => ({
  id, subjectNameAr: subject, levelId: 1, examType: 'term_1', gender: 'male',
  scheduledAt: iso, isLocked: false, maxScore: 100, passScore: 50,
});

const examsKey = `GET /exams?${toQueryString({ levelId: 1, page: 1, pageSize: 100 })}`;

const ROUTES: StubRoutes = {
  'GET /academic-years/10': YEAR,
  [examsKey]: {
    items: [exam('ex1', 'القرآن', '2026-09-11T09:00:00Z'), exam('ex2', 'التفسير', '2026-09-18T09:00:00Z')],
    total: 2, page: 1, pageSize: 100,
  },
};

function renderTab(isHeadTeacher: boolean) {
  const http = stubHttpClient(ROUTES);
  render(
    <Provider store={makeStore(http)}>
      <MemoryRouter>
        <ScoresTab section={SECTION} isHeadTeacher={isHeadTeacher} />
      </MemoryRouter>
    </Provider>,
  );
}

afterEach(cleanup);

describe('ScoresTab — date-first', () => {
  it('defaults to the latest exam day and lists only that day’s exams', async () => {
    renderTab(false);

    // Latest day (18th) is التفسير; the 11th's القرآن is another day, hidden.
    expect(await screen.findByText('التفسير')).toBeDefined();
    expect(screen.queryByText('القرآن')).toBeNull();
  });

  it('hides the create button from a teacher', async () => {
    renderTab(false);
    await screen.findByText('التفسير');

    expect(screen.queryByRole('button', { name: 'إضافة امتحان' })).toBeNull();
  });

  it('offers the create button to the head teacher', async () => {
    renderTab(true);
    await screen.findByText('التفسير');

    expect(screen.getByRole('button', { name: 'إضافة امتحان' })).toBeDefined();
  });
});
