// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { AttendanceTab } from './AttendanceSheet';
import { makeStore } from '../../shared/api/store';
import { DEFAULT_PAGE_SIZE, toQueryString } from '../../shared/api/pagination';
import { stubHttpClient, type StubRoutes } from '../../test/stub-http-client';
import '../../shared/i18n';

/* The date-first attendance view names the class (subject + time) in the column
   header — "the name of the class will be shown" — so the teacher knows which
   period they are marking rather than a bare column number. */

const YEAR = {
  id: 10, hijriYear: 1447, startsOn: '2026-08-01', endsOn: '2027-06-01', status: 'active',
  terms: [{ id: 5, academicYearId: 10, termNumber: 1, startsOn: '2026-08-01', endsOn: '2027-01-01', examStartsOn: null, examEndsOn: null, status: 'active' }],
};

const SESSIONS = {
  items: [{ id: 'sess1', subjectNameAr: 'القرآن', sheikhName: 'الشيخ', sessionNo: 1, sessionDate: '2026-09-18', startsAt: '16:00', endsAt: '17:00', mode: 'onsite', status: 'scheduled', room: null, meetingUrl: null, cancelReason: null }],
  total: 1, page: 1, pageSize: DEFAULT_PAGE_SIZE,
};

const GRID = {
  sectionId: 'sec1',
  sessions: [{ id: 'sess1', sessionNo: 1, sessionDate: '2026-09-18', startsAt: '16:00', subjectNameAr: 'القرآن', sheikhName: 'الشيخ', mode: 'onsite', status: 'scheduled' }],
  rows: [{ enrollmentId: 'e1', studentName: 'أحمد سالم', studentCode: '2026-1', cells: [{ sessionId: 'sess1', status: null }], absenceCount: 0 }],
};

const sessionsKey = `GET /sessions?${toQueryString({ sectionId: 'sec1', page: 1, pageSize: DEFAULT_PAGE_SIZE })}`;
const gridKey = `GET /sections/sec1/attendance?${toQueryString({ termId: 5, date: '2026-09-18' })}`;

const ROUTES: StubRoutes = {
  'GET /academic-years/10': YEAR,
  [sessionsKey]: SESSIONS,
  [gridKey]: GRID,
  'POST /sessions/sess1/attendance': { saved: 1, warnings: [] },
};

function renderTab() {
  const http = stubHttpClient(ROUTES);
  render(
    <Provider store={makeStore(http)}>
      <AttendanceTab sectionId="sec1" academicYearId={10} />
    </Provider>,
  );
  return http;
}

afterEach(cleanup);

describe('AttendanceTab — date-first', () => {
  it('shows the class name in the column header for the chosen day', async () => {
    renderTab();

    // The day's grid loaded: the student row and the subject-named column.
    expect(await screen.findByText('أحمد سالم')).toBeDefined();
    expect(screen.getByText('القرآن')).toBeDefined();
  });

  it('cycles a cell on tap and saves the column with the marked status', async () => {
    // Preserves the coverage from the retired term-grid page: the shared
    // interactive sheet cycles an unrecorded cell to present and saves it.
    const http = renderTab();
    const user = userEvent.setup();

    await screen.findByText('أحمد سالم');
    await user.click(screen.getByRole('button', { name: 'غير مسجَّل' }));
    expect(screen.getByRole('button', { name: 'حاضر' })).toBeDefined();

    await user.click(screen.getByRole('button', { name: 'حفظ' }));

    await waitFor(() => expect(http.countOf('POST /sessions/sess1/attendance')).toBe(1));
    const save = http.calls.find((c) => c.method === 'POST' && c.path === '/sessions/sess1/attendance');
    expect(save?.body).toEqual({ entries: [{ enrollmentId: 'e1', status: 'present' }] });
  });
});
