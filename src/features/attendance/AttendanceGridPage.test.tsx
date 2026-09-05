// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { AttendanceGridPage } from './AttendanceGridPage';
import { makeStore } from '../../shared/api/store';
import { toQueryString } from '../../shared/api/pagination';
import { stubHttpClient, type StubRoutes } from '../../test/stub-http-client';
import '../../shared/i18n';

/* Proves the F2 exit criterion that matters: an unrecorded cell cycles to a
   status on tap, and saving that session column posts exactly the marked
   students. Runs the real store, RTK Query cache and DataTable against a stub. */

const SECTION = { id: 'sec1', name: 'المستوى الأول - بنين', gender: 'male', levelId: 1, academicYearId: 10 };
const YEAR = { id: 10, hijriYear: 1447, terms: [{ id: 5, termNumber: 1, status: 'active' }] };
const GRID = {
  sectionId: 'sec1',
  sessions: [{ id: 'sess1', sessionNo: 1, sessionDate: '2026-09-01' }],
  rows: [
    {
      enrollmentId: 'enr1',
      studentName: 'أحمد سالم',
      studentCode: '2026-0001',
      cells: [{ sessionId: 'sess1', status: null }],
      absenceCount: 0,
    },
  ],
};

const ROUTES: StubRoutes = {
  'GET /sections/sec1': SECTION,
  'GET /academic-years/10': YEAR,
  [`GET /sections/sec1/attendance?${toQueryString({ termId: 5 })}`]: GRID,
  'POST /sessions/sess1/attendance': { saved: 1, warnings: [] },
};

function renderGrid() {
  const http = stubHttpClient(ROUTES);
  render(
    <Provider store={makeStore(http)}>
      <MemoryRouter initialEntries={['/attendance/sec1']}>
        <Routes>
          <Route path="/attendance/:sectionId" element={<AttendanceGridPage />} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
  return http;
}

afterEach(cleanup);

describe('AttendanceGridPage', () => {
  it('cycles a cell on tap and saves the column with the marked status', async () => {
    const http = renderGrid();
    const user = userEvent.setup();

    // Grid loaded: the student row is present, its cell unrecorded.
    await screen.findByText('أحمد سالم');
    await user.click(screen.getByRole('button', { name: 'غير مسجَّل' }));
    // One tap: unrecorded → present.
    expect(screen.getByRole('button', { name: 'حاضر' })).toBeDefined();

    await user.click(screen.getByRole('button', { name: 'حفظ' }));

    await waitFor(() => expect(http.countOf('POST /sessions/sess1/attendance')).toBe(1));
    const save = http.calls.find((c) => c.method === 'POST' && c.path === '/sessions/sess1/attendance');
    expect(save?.body).toEqual({ entries: [{ enrollmentId: 'enr1', status: 'present' }] });
  });
});
