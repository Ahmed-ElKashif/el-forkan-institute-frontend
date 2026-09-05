// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { SessionsPage } from './SessionsPage';
import { makeStore } from '../../shared/api/store';
import { DEFAULT_PAGE_SIZE, toQueryString } from '../../shared/api/pagination';
import { stubHttpClient, type StubRoutes } from '../../test/stub-http-client';
import '../../shared/i18n';

/* A section's sessions with reschedule/cancel. Proves the list renders and that
   cancelling a session PATCHes it with the status and the mandatory reason. */

const SESSION = {
  id: 's1',
  subjectNameAr: 'النحو',
  sessionNo: 1,
  sessionDate: '2026-09-01',
  startsAt: '08:00:00',
  endsAt: '09:00:00',
  mode: 'onsite',
  room: 'A1',
  meetingUrl: null,
  status: 'scheduled',
  cancelReason: null,
};

const listKey = `GET /sessions?${toQueryString({ sectionId: 'sec1', page: 1, pageSize: DEFAULT_PAGE_SIZE })}`;

const BASE: StubRoutes = {
  'GET /sections/sec1': { id: 'sec1', name: 'فصل النحو', gender: 'male', levelId: 1, branchId: 1, academicYearId: 1 },
  [listKey]: { items: [SESSION], total: 1, page: 1, pageSize: DEFAULT_PAGE_SIZE },
};

function renderPage(routes: StubRoutes = {}) {
  const http = stubHttpClient({ ...BASE, ...routes });
  render(
    <Provider store={makeStore(http)}>
      <MemoryRouter initialEntries={['/sessions/sec1']}>
        <Routes>
          <Route path="/sessions/:sectionId" element={<SessionsPage />} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
  return http;
}

afterEach(cleanup);

describe('SessionsPage', () => {
  it('cancels a session with a reason', async () => {
    const http = renderPage({ 'PATCH /sessions/s1': { ...SESSION, status: 'cancelled', cancelReason: 'ظرف طارئ' } });
    const user = userEvent.setup();
    await screen.findByText('النحو');

    await user.click(screen.getByLabelText('تعديل الحصة'));
    // Selects in the dialog, in order: mode, status.
    await user.selectOptions(screen.getAllByRole('combobox')[1], 'cancelled');
    await user.type(await screen.findByLabelText('سبب الإلغاء'), 'ظرف طارئ');
    await user.click(screen.getByRole('button', { name: 'حفظ' }));

    await waitFor(() => expect(http.countOf('PATCH /sessions/s1')).toBe(1));
    const patch = http.calls.find((c) => c.method === 'PATCH' && c.path === '/sessions/s1');
    expect(patch?.body).toMatchObject({ status: 'cancelled', cancelReason: 'ظرف طارئ' });
  });
});
