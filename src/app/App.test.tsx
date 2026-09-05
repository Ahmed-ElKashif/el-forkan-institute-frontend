// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import { AuthGateway, AuthService, MemoryTokenStore, type AuthUser } from '../features/auth';
import { HttpError } from '../shared/http/http.errors';
import { stubHttpClient, type StubRoutes } from '../test/stub-http-client';

/* One integration test, not a suite of component tests.
 *
 * It exists to prove the wiring: container -> providers -> router -> guarded
 * route, and that a real sign-in moves the app from the login screen to the
 * signed-in one. That path spans every layer, so it is the one place a
 * component-level test earns its cost. Everything narrower is covered by the
 * unit tests over core/ and infra/.
 *
 * It is also what the DI seam buys: the whole app runs against a fake gateway
 * with no network, no MSW, and no mocking of fetch. */

const USER: AuthUser = {
  id: 'a1',
  fullName: 'محمود عبد الله',
  username: 'headteacher',
  gender: 'male',
  role: 'head_teacher',
  branchId: 1,
  phone: '+201000000000',
  email: 'headteacher@example.com',
  isActive: true,
};

const TEACHER: AuthUser = {
  ...USER,
  id: 'b2',
  fullName: 'أحمد سالم',
  username: 'teacher1',
  email: 'teacher1@example.com',
  role: 'teacher',
};

/* No refresh cookie, so the boot-time restore finds no session and the app
   lands on the sign-in screen — the state a real first visit starts from. */
const NO_SESSION: StubRoutes = {
  'GET /auth/refresh/csrf-token': { csrfToken: 'csrf-1' },
  'POST /auth/refresh': () => {
    throw new HttpError(401, { message: 'Missing refresh token' });
  },
  /* Two-factor (F12): the password step yields a challenge; the code step
     yields the session. */
  'POST /auth/login': { mfaRequired: true, challengeId: 'ch1' },
  'POST /auth/verify-otp': { accessToken: 'access-1', user: USER },
  'GET /users/me': USER,
  /* The signed-in landing page is the dashboard, which reads the current year
     then its summary. Stubbed so these auth/routing tests land on a rendered
     shell rather than a dashboard error state. */
  'GET /academic-years?page=1&pageSize=1': { items: [{ id: 1, hijriYear: 1447 }], total: 1, page: 1, pageSize: 1 },
  'GET /reports/summary?academicYearId=1': {
    academicYearId: 1,
    hijriYear: 1447,
    students: { active: 0, withPhone: 0, phoneCoverage: 0 },
    enrollments: 0,
    sections: 0,
    pendingCarries: 0,
    certificatesIssued: 0,
  },
  // The dashboard's chart feeds; empty here, so the charts show their empty
  // state rather than an error on these auth/routing tests. The trend resolves
  // its term from the year detail (no terms → nothing to plot).
  'GET /reports/headcount-by-level?academicYearId=1': [],
  'GET /reports/pass-rates?academicYearId=1': [],
  'GET /reports/headcount-by-markaz?academicYearId=1': [],
  'GET /academic-years/1': { id: 1, hijriYear: 1447, terms: [] },
};

function containerWith(routes: StubRoutes = {}) {
  const http = stubHttpClient({ ...NO_SESSION, ...routes });
  return { auth: new AuthService(new AuthGateway(http), new MemoryTokenStore()), http };
}

function containerAs(account: AuthUser) {
  /* The session (and thus the signed-in identity) comes from the second step. */
  return containerWith({ 'POST /auth/verify-otp': { accessToken: 'access-1', user: account } });
}

/** The OTP is six single-digit boxes now, so a code is pasted into the first
 *  box (its natural entry) rather than typed into one field. */
async function enterOtp(ui: ReturnType<typeof userEvent.setup>, code: string) {
  const boxes = await screen.findAllByRole('textbox');
  await ui.click(boxes[0]);
  await ui.paste(code);
}

async function signInAs(account: AuthUser, password = 'ChangeMe123!') {
  const ui = userEvent.setup();
  await ui.type(await screen.findByLabelText(/البريد الإلكتروني/), account.email ?? '');
  await ui.type(screen.getByLabelText(/كلمة المرور/), password);
  await ui.click(screen.getByRole('button', { name: /متابعة/ }));
  await enterOtp(ui, '123456');
  await ui.click(screen.getByRole('button', { name: /تأكيد الدخول/ }));
}

/* Vitest runs without globals, so RTL's automatic cleanup never registers
   itself and renders would otherwise pile up across tests. The URL is reset
   because one test below starts the app at a deep link. */
afterEach(() => {
  cleanup();
  window.history.pushState({}, '', '/');
});

describe('App', () => {
  it('signs in with email then the emailed code and lands on the signed-in page', async () => {
    const { auth, http } = containerWith();
    render(<App container={{ auth, http }} />);

    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/البريد الإلكتروني/), 'headteacher@example.com');
    await user.type(screen.getByLabelText(/كلمة المرور/), 'ChangeMe123!');
    await user.click(screen.getByRole('button', { name: /متابعة/ }));

    /* Step one sends only the credentials; no session yet (F12). */
    const login = http.calls.find((c) => c.path === '/auth/login');
    expect(login?.body).toEqual({ email: 'headteacher@example.com', password: 'ChangeMe123!' });

    await enterOtp(user, '123456');
    await user.click(screen.getByRole('button', { name: /تأكيد الدخول/ }));

    /* Step two carries the challenge id and the code. */
    const verify = http.calls.find((c) => c.path === '/auth/verify-otp');
    expect(verify?.body).toEqual({ challengeId: 'ch1', code: '123456' });
    /* The sign-out control only exists behind the guarded route, so finding it
       is what proves navigation actually happened. */
    expect(await screen.findByRole('button', { name: /تسجيل الخروج/ })).toBeDefined();
  });

  it('reports a throttled sign-in as a throttle, not as a bad password', async () => {
    const { auth, http } = containerWith({
      'POST /auth/login': () => {
        throw new HttpError(429, { message: 'ThrottlerException: Too Many Requests' });
      },
    });
    render(<App container={{ auth, http }} />);

    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/البريد الإلكتروني/), 'headteacher@example.com');
    await user.type(screen.getByLabelText(/كلمة المرور/), 'wrong');
    await user.click(screen.getByRole('button', { name: /متابعة/ }));

    expect(await screen.findByText(/خمس محاولات في الدقيقة/)).toBeDefined();
  });

  it("omits the head-teacher-only sections from a teacher's sidebar", async () => {
    const { auth, http } = containerAs(TEACHER);
    render(<App container={{ auth, http }} />);

    await signInAs(TEACHER);
    /* Landed inside the shell — the sign-out control only exists there. */
    expect(await screen.findByRole('button', { name: /تسجيل الخروج/ })).toBeDefined();

    /* Shared sections stay; the three head-teacher-only ones are gone entirely,
       not rendered disabled. */
    expect(screen.getByText('الطلاب')).toBeDefined();
    expect(screen.queryByText('الاستيراد')).toBeNull();
    expect(screen.queryByText('الشهادات')).toBeNull();
    expect(screen.queryByText('سجل المراجعة')).toBeNull();
  });

  it('shows a teacher a 403 when they open a head-teacher-only URL directly', async () => {
    window.history.pushState({}, '', '/imports');
    const { auth, http } = containerAs(TEACHER);
    render(<App container={{ auth, http }} />);

    /* The deep link bounced to login; signing in sends the teacher back to it,
       where the route guard refuses the page rather than rendering it. */
    await signInAs(TEACHER);
    expect(await screen.findByText(/لا تملك صلاحية الوصول/)).toBeDefined();
  });
});
