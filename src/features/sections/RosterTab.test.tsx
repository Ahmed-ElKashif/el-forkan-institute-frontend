// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { RosterTab } from './RosterTab';
import { AuthGateway, AuthProvider, AuthService, MemoryTokenStore, type AuthUser } from '../auth';
import { DiProvider } from '../../shared/di/DiProvider';
import { makeStore } from '../../shared/api/store';
import { DEFAULT_PAGE_SIZE, toQueryString } from '../../shared/api/pagination';
import { stubHttpClient, type StubRoutes } from '../../test/stub-http-client';
import '../../shared/i18n';

/* The roster is where students are managed. Both roles add/edit; only the head
   teacher withdraws (the reversible "remove from this class"). These prove the
   role gate on withdraw and that add-new writes the two calls it must. */

const HEAD: AuthUser = {
  id: 'h1', fullName: 'محمود', username: 'head', gender: 'male',
  role: 'head_teacher', branchId: 1, phone: '+201000000000', email: null, isActive: true,
};
const TEACHER: AuthUser = { ...HEAD, id: 't1', fullName: 'أحمد', username: 'teacher', role: 'teacher' };

const rosterKey = `GET /enrollments?${toQueryString({ sectionId: 'sec-1', page: 1, pageSize: DEFAULT_PAGE_SIZE, status: 'active' })}`;
const ROSTER = {
  items: [{ id: 'enr-1', studentId: 'stu-1', studentName: 'سالم أحمد', entryType: 'new', status: 'active', isHistorical: false }],
  total: 1, page: 1, pageSize: DEFAULT_PAGE_SIZE,
};

function baseRoutes(user: AuthUser): StubRoutes {
  return {
    'GET /auth/refresh/csrf-token': { csrfToken: 'x' },
    'POST /auth/refresh': { accessToken: 'a' },
    'GET /users/me': user,
    [rosterKey]: ROSTER,
    [`GET /governorates?${toQueryString({ page: 1, pageSize: 100 })}`]: { items: [], total: 0, page: 1, pageSize: 100 },
  };
}

function renderRoster(user: AuthUser, extra: StubRoutes = {}) {
  const http = stubHttpClient({ ...baseRoutes(user), ...extra });
  const container = { auth: new AuthService(new AuthGateway(http), new MemoryTokenStore()), http };
  render(
    <DiProvider container={container}>
      <Provider store={makeStore(http)}>
        <AuthProvider>
          <MemoryRouter>
            <RosterTab sectionId="sec-1" sectionGender="male" sectionBranchId={1} />
          </MemoryRouter>
        </AuthProvider>
      </Provider>
    </DiProvider>,
  );
  return http;
}

afterEach(cleanup);

describe('RosterTab', () => {
  it('offers withdraw to the head teacher but not to a teacher', async () => {
    renderRoster(HEAD);
    await userEvent.click(await screen.findByRole('button', { name: 'إجراءات' }));
    expect(screen.getByText('سحب من الفصل')).toBeDefined();

    cleanup();
    renderRoster(TEACHER);
    await userEvent.click(await screen.findByRole('button', { name: 'إجراءات' }));
    expect(screen.getByText('تعديل البيانات')).toBeDefined();
    expect(screen.queryByText('سحب من الفصل')).toBeNull();
  });

  it('withdraws a student by patching the enrolment status', async () => {
    const http = renderRoster(HEAD, { 'PATCH /enrollments/enr-1': { id: 'enr-1', status: 'withdrawn' } });
    await userEvent.click(await screen.findByRole('button', { name: 'إجراءات' }));
    await userEvent.click(screen.getByText('سحب من الفصل'));
    // Confirm in the dialog (the confirm button repeats the action label).
    const buttons = screen.getAllByRole('button', { name: 'سحب من الفصل' });
    await userEvent.click(buttons[buttons.length - 1]);

    await waitFor(() => expect(http.countOf('PATCH /enrollments/enr-1')).toBe(1));
    const patch = http.calls.find((c) => c.method === 'PATCH' && c.path === '/enrollments/enr-1');
    expect(patch?.body).toEqual({ status: 'withdrawn' });
  });

  it('registers a new student then enrols them into the class', async () => {
    const http = renderRoster(HEAD, {
      'POST /students': { id: 'new-1', fullName: 'عبد الله كريم' },
      'POST /enrollments': { id: 'enr-2' },
    });
    await userEvent.click(await screen.findByRole('button', { name: 'إضافة طالب' }));
    await userEvent.click(await screen.findByRole('button', { name: 'إضافة طالب جديد' }));
    await userEvent.type(screen.getByLabelText('الاسم الكامل'), 'عبد الله كريم');
    await userEvent.click(screen.getByRole('button', { name: 'حفظ وإضافة' }));

    await waitFor(() => expect(http.countOf('POST /enrollments')).toBe(1));
    const create = http.calls.find((c) => c.method === 'POST' && c.path === '/students');
    // Gender and branch come from the class, not the form.
    expect(create?.body).toMatchObject({ fullName: 'عبد الله كريم', gender: 'male', branchId: 1 });
    const enroll = http.calls.find((c) => c.method === 'POST' && c.path === '/enrollments');
    expect(enroll?.body).toEqual({ studentId: 'new-1', sectionId: 'sec-1' });
  });
});
