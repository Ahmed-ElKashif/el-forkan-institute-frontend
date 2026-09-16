// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { ProfilePage } from './ProfilePage';
import { AuthGateway, AuthProvider, AuthService, MemoryTokenStore, type AuthUser } from '../auth';
import { DiProvider } from '../../shared/di/DiProvider';
import { makeStore } from '../../shared/api/store';
import { stubHttpClient, type StubRoutes } from '../../test/stub-http-client';
import '../../shared/i18n';

/* The profile screen changes a password and (for the head teacher) edits the
   account. These prove the two writes carry the right bodies. Real auth against
   a stub, like the other shell-aware screens. */

const HEAD: AuthUser = {
  id: 'h1', fullName: 'محمود عبد الله', username: 'headteacher', gender: 'male',
  role: 'head_teacher', branchId: 1, phone: '+201000000000', email: 'admin@forkan.test', isActive: true,
};

const BASE: StubRoutes = {
  'GET /auth/refresh/csrf-token': { csrfToken: 'x' },
  'POST /auth/refresh': { accessToken: 'a' },
  'GET /users/me': HEAD,
};

function renderProfile(routes: StubRoutes = {}) {
  const http = stubHttpClient({ ...BASE, ...routes });
  const container = { auth: new AuthService(new AuthGateway(http), new MemoryTokenStore()), http };
  render(
    <DiProvider container={container}>
      <Provider store={makeStore(http)}>
        <AuthProvider>
          <ProfilePage />
        </AuthProvider>
      </Provider>
    </DiProvider>,
  );
  return http;
}

afterEach(cleanup);

describe('ProfilePage', () => {
  it('changes the password with the current and new one', async () => {
    const http = renderProfile({ 'POST /users/me/password': null });
    await screen.findByText('محمود عبد الله');

    await userEvent.type(screen.getByLabelText('كلمة المرور الحالية'), 'old-secret');
    await userEvent.type(screen.getByLabelText('كلمة المرور الجديدة'), 'brand-new-secret');
    await userEvent.type(screen.getByLabelText('تأكيد كلمة المرور الجديدة'), 'brand-new-secret');
    await userEvent.click(screen.getByRole('button', { name: 'تغيير كلمة المرور' }));

    await waitFor(() => expect(http.countOf('POST /users/me/password')).toBe(1));
    const post = http.calls.find((c) => c.method === 'POST' && c.path === '/users/me/password');
    expect(post?.body).toEqual({ currentPassword: 'old-secret', newPassword: 'brand-new-secret' });
  });

  it('lets the head teacher edit their own name', async () => {
    const http = renderProfile({ 'PATCH /users/h1': { ...HEAD, fullName: 'محمود الأسواني' } });
    await screen.findByText('محمود عبد الله');

    const name = screen.getByLabelText('الاسم');
    await userEvent.clear(name);
    await userEvent.type(name, 'محمود الأسواني');
    await userEvent.click(screen.getByRole('button', { name: 'حفظ التغييرات' }));

    await waitFor(() => expect(http.countOf('PATCH /users/h1')).toBe(1));
    const patch = http.calls.find((c) => c.method === 'PATCH' && c.path === '/users/h1');
    expect(patch?.body).toEqual({
      fullName: 'محمود الأسواني',
      username: 'headteacher',
      gender: 'male',
      phone: '+201000000000',
      email: 'admin@forkan.test',
    });
  });
});
