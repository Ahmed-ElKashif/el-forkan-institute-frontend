// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { ClassDaysTab } from './ClassDaysTab';
import { makeStore } from '../../shared/api/store';
import { DEFAULT_PAGE_SIZE, toQueryString } from '../../shared/api/pagination';
import { stubHttpClient, type StubRoutes } from '../../test/stub-http-client';
import '../../shared/i18n';

/* An upcoming class day is a plan — its periods can be edited or removed. A past
   day is a record (attendance already taken), so it is locked. These dates —
   long past and far future — keep the test deterministic regardless of when it
   runs. */

const period = (id: string, subjectId: number, subjectNameAr: string, date: string, status: string) => ({
  id, subjectId, subjectNameAr, sheikhName: 'الشيخ', sessionNo: 1, sessionDate: date,
  startsAt: '16:00', endsAt: '17:00', mode: 'onsite', status, room: null, meetingUrl: null, cancelReason: null,
});

const sessionsKey = `GET /sessions?${toQueryString({ sectionId: 'sec1', page: 1, pageSize: DEFAULT_PAGE_SIZE })}`;

const ROUTES: StubRoutes = {
  [sessionsKey]: {
    items: [
      period('past1', 1, 'القرآن', '2020-09-18', 'held'),
      period('fut1', 2, 'التفسير', '2099-09-18', 'scheduled'),
    ],
    total: 2, page: 1, pageSize: DEFAULT_PAGE_SIZE,
  },
};

function renderTab() {
  const http = stubHttpClient(ROUTES);
  render(
    <Provider store={makeStore(http)}>
      <ClassDaysTab levelId={2} academicYearId={1} sectionId="sec1" />
    </Provider>,
  );
}

afterEach(cleanup);

describe('ClassDaysTab — past vs upcoming', () => {
  it('locks a past day and keeps the upcoming one editable', async () => {
    renderTab();

    // Both days render.
    expect(await screen.findByText('القرآن')).toBeDefined();
    expect(screen.getByText('التفسير')).toBeDefined();

    // Only the upcoming day exposes edit/delete (one period each), and it offers
    // an "add subject" button; the past day is marked and offers neither.
    expect(screen.getAllByRole('button', { name: 'تعديل الحصة' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'حذف الحصة' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'إضافة مادة' })).toHaveLength(1);
    expect(screen.getByText('سابق')).toBeDefined();
  });
});
