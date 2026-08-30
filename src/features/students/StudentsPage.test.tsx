// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { StudentsPage } from './StudentsPage';
import type { Student } from './student.model';
import { makeStore } from '../../shared/api/store';
import { DEFAULT_PAGE_SIZE, toQueryString, type Page } from '../../shared/api/pagination';
import { stubHttpClient, type StubRoutes } from '../../test/stub-http-client';
import '../../shared/i18n';

/* Proves the F1 exit criteria for the roster: real Arabic names render in the
   table, and searching issues one filtered request (debounced) whose result
   replaces the list. Runs the real store, the real RTK Query cache and the real
   DataTable against a stubbed transport — no fetch, no MSW. */

const AHMAD: Student = {
  id: 'a',
  studentCode: '2024-0001',
  fullName: 'أحمد سالم عبد الله',
  gender: 'male',
  phone: '+201000000001',
  status: 'active',
};

const MAHMOUD: Student = {
  id: 'b',
  studentCode: '2024-0002',
  fullName: 'محمود إبراهيم',
  gender: 'male',
  phone: null,
  status: 'graduated',
};

function pageOf(items: Student[]): Page<Student> {
  return { items, total: items.length, page: 1, pageSize: DEFAULT_PAGE_SIZE };
}

/* Build the route key the same way the component builds the path, so an encoded
   Arabic search term always lines up rather than being transcribed by hand. */
const listKey = (search = '') => `GET /students?${toQueryString({ page: 1, pageSize: DEFAULT_PAGE_SIZE, search })}`;

function renderStudents(routes: StubRoutes) {
  const http = stubHttpClient(routes);
  render(
    <Provider store={makeStore(http)}>
      <StudentsPage />
    </Provider>,
  );
  return http;
}

afterEach(cleanup);

describe('StudentsPage', () => {
  it('renders the roster with real Arabic names and a total', async () => {
    renderStudents({ [listKey()]: pageOf([AHMAD, MAHMOUD]) });

    expect(await screen.findByText('أحمد سالم عبد الله')).toBeDefined();
    expect(screen.getByText('محمود إبراهيم')).toBeDefined();
    expect(screen.getByText(/الإجمالي/)).toBeDefined();
  });

  it('issues one filtered request when the search term settles', async () => {
    const http = renderStudents({
      [listKey()]: pageOf([AHMAD, MAHMOUD]),
      [listKey('محمود')]: pageOf([MAHMOUD]),
    });
    await screen.findByText('أحمد سالم عبد الله');

    await userEvent.type(screen.getByRole('searchbox'), 'محمود');

    /* Assert the settled state as one condition: while the filtered request is
       in flight the table is a skeleton (both names absent), so checking the two
       names together is what distinguishes "filtered" from "still loading". */
    await waitFor(() => {
      expect(screen.getByText('محمود إبراهيم')).toBeDefined();
      expect(screen.queryByText('أحمد سالم عبد الله')).toBeNull();
    });
    expect(http.countOf(listKey('محمود'))).toBe(1);
  });
});
