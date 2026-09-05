// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { StudentsPage } from './StudentsPage';
import type { Student } from './student.model';
import type { Level } from '../catalogue';
import { makeStore } from '../../shared/api/store';
import { DEFAULT_PAGE_SIZE, toQueryString, type Page } from '../../shared/api/pagination';
import { stubHttpClient, type StubRoutes } from '../../test/stub-http-client';
import '../../shared/i18n';

/* Roster behaviour: real Arabic names render, the study-year column shows the
   student's level, filtering by study year issues a scoped request, and the
   attendance-risk badge flags a student near the absence limit. Real store + RTK
   Query cache + DataTable against a stubbed transport — no fetch, no MSW. */

const AHMAD: Student = {
  id: 'a',
  fullName: 'أحمد سالم عبد الله',
  gender: 'male',
  phone: '+201000000001',
  status: 'active',
  levelId: 1,
  levelName: 'المستوى الأول',
  absences: 3,
  warnAt: 3,
  maxAbsences: 4,
  attendanceRisk: 'warning',
};

const MAHMOUD: Student = {
  id: 'b',
  fullName: 'محمود إبراهيم',
  gender: 'male',
  phone: null,
  status: 'graduated',
  levelId: null,
  levelName: null,
  absences: 0,
  warnAt: null,
  maxAbsences: null,
  attendanceRisk: 'none',
};

const LEVELS: Level[] = [
  { id: 1, code: 'L1', nameAr: 'المستوى الأول', sortOrder: 2, isOptional: false, isTerminal: false, allowsCarry: true, grantsCertificate: true, requiresCleanEntry: false },
  { id: 2, code: 'L2', nameAr: 'المستوى الثاني', sortOrder: 3, isOptional: false, isTerminal: false, allowsCarry: true, grantsCertificate: true, requiresCleanEntry: false },
];

function pageOf(items: Student[]): Page<Student> {
  return { items, total: items.length, page: 1, pageSize: DEFAULT_PAGE_SIZE };
}

/* Build the route key the same way the component builds the path, so an encoded
   Arabic search term or a level id always lines up rather than being hand-typed. */
const listKey = (opts: { search?: string; levelId?: number; gender?: string } = {}) =>
  `GET /students?${toQueryString({ page: 1, pageSize: DEFAULT_PAGE_SIZE, search: opts.search ?? '', levelId: opts.levelId, gender: opts.gender })}`;

function renderStudents(routes: StubRoutes) {
  const http = stubHttpClient({ 'GET /levels': LEVELS, ...routes });
  render(
    <Provider store={makeStore(http)}>
      {/* The name cell links to the profile, so the roster needs router context. */}
      <MemoryRouter>
        <StudentsPage />
      </MemoryRouter>
    </Provider>,
  );
  return http;
}

afterEach(cleanup);

describe('StudentsPage', () => {
  it('renders the roster with names and each student’s study year', async () => {
    renderStudents({ [listKey()]: pageOf([AHMAD, MAHMOUD]) });

    expect(await screen.findByText('أحمد سالم عبد الله')).toBeDefined();
    // AHMAD's level shows in the study-year column (the old code column is gone).
    // It appears twice — once in his row, once as a level-filter option — so the
    // row cell rendering it is what pushes the count past the filter's single one.
    expect(screen.getAllByText('المستوى الأول').length).toBeGreaterThanOrEqual(2);
    // MAHMOUD is not enrolled this year, so a dash stands in for his study year
    // (his empty phone renders one too, hence "all").
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/الإجمالي/)).toBeDefined();
  });

  it('issues one filtered request when the search term settles', async () => {
    const http = renderStudents({
      [listKey()]: pageOf([AHMAD, MAHMOUD]),
      [listKey({ search: 'محمود' })]: pageOf([MAHMOUD]),
    });
    await screen.findByText('أحمد سالم عبد الله');

    await userEvent.type(screen.getByRole('searchbox'), 'محمود');

    await waitFor(() => {
      expect(screen.getByText('محمود إبراهيم')).toBeDefined();
      expect(screen.queryByText('أحمد سالم عبد الله')).toBeNull();
    });
    expect(http.countOf(listKey({ search: 'محمود' }))).toBe(1);
  });

  it('requests only the chosen study year when the level filter changes', async () => {
    const http = renderStudents({
      [listKey()]: pageOf([AHMAD, MAHMOUD]),
      [listKey({ levelId: 2 })]: pageOf([MAHMOUD]),
    });
    await screen.findByText('أحمد سالم عبد الله');

    await userEvent.selectOptions(screen.getByLabelText('السنة الدراسية'), '2');

    await waitFor(() => expect(http.countOf(listKey({ levelId: 2 }))).toBe(1));
  });

  it('requests only the chosen group when the gender filter changes', async () => {
    const http = renderStudents({
      [listKey()]: pageOf([AHMAD, MAHMOUD]),
      [listKey({ gender: 'female' })]: pageOf([MAHMOUD]),
    });
    await screen.findByText('أحمد سالم عبد الله');

    await userEvent.selectOptions(screen.getByLabelText('المجموعة'), 'female');

    await waitFor(() => expect(http.countOf(listKey({ gender: 'female' }))).toBe(1));
  });

  it('flags a student near the absence limit with a risk badge', async () => {
    renderStudents({ [listKey()]: pageOf([AHMAD, MAHMOUD]) });
    await screen.findByText('أحمد سالم عبد الله');

    // AHMAD is at the warn line (3 of 4), so his row shows the risk badge with
    // the count; MAHMOUD (no risk) shows a dash, not the badge.
    expect(screen.getByText(/قريب من الحد/)).toBeDefined();
    expect(screen.getByText('(3/4)')).toBeDefined();
  });
});
