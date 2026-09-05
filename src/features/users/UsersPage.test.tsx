// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { UsersPage } from './UsersPage';
import type { User } from './user.model';
import { makeStore } from '../../shared/api/store';
import { toQueryString, type Page } from '../../shared/api/pagination';
import { stubHttpClient, type StubRoutes } from '../../test/stub-http-client';
import '../../shared/i18n';

/* Proves user management: the roster renders, creating posts the account fields,
   and deleting demands a reason before it soft-deletes (R9). Real store and
   DataTable against a stub. */

const USER: User = {
  id: 'u1',
  fullName: 'أحمد المعلّم',
  username: 'teacher1',
  gender: 'male',
  role: 'teacher',
  branchId: 1,
  phone: '+201000000001',
  email: null,
  isActive: true,
};

const BRANCHES = { items: [{ id: 1, nameAr: 'الفرع الرئيسي', isActive: true }], total: 1, page: 1, pageSize: 100 };
const listKey = `GET /users?${toQueryString({ page: 1, pageSize: 25 })}`;
const branchesKey = `GET /branches?${toQueryString({ page: 1, pageSize: 100 })}`;

function pageOf(items: User[]): Page<User> {
  return { items, total: items.length, page: 1, pageSize: 25 };
}

function renderUsers(routes: StubRoutes) {
  const http = stubHttpClient({ [listKey]: pageOf([USER]), ...routes });
  render(
    <Provider store={makeStore(http)}>
      <UsersPage />
    </Provider>,
  );
  return http;
}

const lastButton = (name: string) => {
  const buttons = screen.getAllByRole('button', { name });
  return buttons[buttons.length - 1];
};

afterEach(cleanup);

describe('UsersPage', () => {
  it('lists staff with their role', async () => {
    renderUsers({});
    expect(await screen.findByText('أحمد المعلّم')).toBeDefined();
    // "معلّم" also appears as a role-filter option, so match the row's username.
    expect(screen.getByText('teacher1')).toBeDefined();
  });

  it('creates a user with the entered fields', async () => {
    const http = renderUsers({ [branchesKey]: BRANCHES, 'POST /users': { ...USER, id: 'u2' } });
    await screen.findByText('أحمد المعلّم');

    await userEvent.click(screen.getByRole('button', { name: 'مستخدم جديد' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'الاسم الكامل' }), 'سالم الجديد');
    await userEvent.type(screen.getByRole('textbox', { name: 'اسم المستخدم' }), 'salem');
    await userEvent.type(screen.getByRole('textbox', { name: 'الهاتف' }), '+201000000009');
    await userEvent.type(screen.getByRole('textbox', { name: 'البريد الإلكتروني' }), 'salem@example.com');
    await userEvent.type(screen.getByLabelText('كلمة المرور'), 'Secret1234');
    await userEvent.click(screen.getByRole('button', { name: 'حفظ' }));

    await waitFor(() => expect(http.countOf('POST /users')).toBe(1));
    const create = http.calls.find((c) => c.method === 'POST' && c.path === '/users');
    const body = create?.body as Record<string, unknown> | undefined;
    // Email is required now — it is the login identity (F12).
    expect(body).toMatchObject({ fullName: 'سالم الجديد', username: 'salem', email: 'salem@example.com', role: 'teacher', gender: 'male', branchId: null });
  });

  it('requires a reason before it soft-deletes', async () => {
    const http = renderUsers({ 'DELETE /users/u1': null });
    await screen.findByText('أحمد المعلّم');

    await userEvent.click(screen.getByRole('button', { name: 'حذف' })); // row action
    expect((lastButton('حذف') as HTMLButtonElement).disabled).toBe(true);
    await userEvent.type(screen.getByRole('textbox'), 'انتهاء التعاقد');
    await userEvent.click(lastButton('حذف'));

    await waitFor(() => expect(http.countOf('DELETE /users/u1')).toBe(1));
    const del = http.calls.find((c) => c.method === 'DELETE' && c.path === '/users/u1');
    const body = del?.body as { reason?: string } | undefined;
    expect(body?.reason).toBe('انتهاء التعاقد');
  });
});
