// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { AcademicYearsPage } from './AcademicYearsPage';
import { AuthGateway, AuthProvider, AuthService, MemoryTokenStore, type AuthUser } from '../auth';
import { DiProvider } from '../../shared/di/DiProvider';
import { makeStore } from '../../shared/api/store';
import { toQueryString } from '../../shared/api/pagination';
import { formatNumber } from '../../ds';
import { stubHttpClient, type StubRoutes } from '../../test/stub-http-client';
import '../../shared/i18n';

/* Years & Terms: setting a year current is the one action with an app-wide
   invariant (exactly one current year). This proves the screen sends the
   status change; the exclusivity itself is enforced and tested server-side. */

const HEAD: AuthUser = {
  id: 'h1', fullName: 'محمود', username: 'head', gender: 'male',
  role: 'head_teacher', branchId: 1, phone: '+201000000000', email: null, isActive: true,
};

const YEAR = {
  id: 2, hijriYear: 1448, startsOn: '2026-08-01', endsOn: '2027-06-01', status: 'planned', terms: [],
};

const yearsKey = `GET /academic-years?${toQueryString({ page: 1, pageSize: 100 })}`;
const sectionsKey = `GET /sections?${toQueryString({ academicYearId: 2, page: 1, pageSize: 1, branchId: undefined })}`;

const BASE: StubRoutes = {
  'GET /auth/refresh/csrf-token': { csrfToken: 'x' },
  'POST /auth/refresh': { accessToken: 'a' },
  'GET /users/me': HEAD,
  [yearsKey]: { items: [YEAR], total: 1, page: 1, pageSize: 100 },
  [sectionsKey]: { items: [], total: 0, page: 1, pageSize: 1 },
  'PATCH /academic-years/2': { ...YEAR, status: 'active' },
  'POST /academic-years': { ...YEAR, id: 3, hijriYear: 1449 },
};

function renderYears() {
  const http = stubHttpClient(BASE);
  const container = { auth: new AuthService(new AuthGateway(http), new MemoryTokenStore()), http };
  render(
    <DiProvider container={container}>
      <Provider store={makeStore(http)}>
        <AuthProvider>
          <MemoryRouter>
            <AcademicYearsPage />
          </MemoryRouter>
        </AuthProvider>
      </Provider>
    </DiProvider>,
  );
  return http;
}

afterEach(cleanup);

describe('AcademicYearsPage', () => {
  it('sets a year as the current one and shows its Hijri span', async () => {
    const http = renderYears();
    // The academic year reads as its two-Hijri-year span (1448 → 1448/1449).
    // Digit script is locale-formatter dependent, so build the expected text the
    // same way the component does rather than hardcoding Latin numerals.
    const span = `${formatNumber(1448)}/${formatNumber(1449)}`;
    expect(await screen.findByText(new RegExp(span.replace('/', '\\/')))).toBeDefined();
    await userEvent.click(screen.getByRole('button', { name: 'تعيينه الحالي' }));

    await waitFor(() => expect(http.countOf('PATCH /academic-years/2')).toBe(1));
    const patch = http.calls.find((c) => c.method === 'PATCH' && c.path === '/academic-years/2');
    expect(patch?.body).toEqual({ status: 'active' });
  });

  it('accepts a Hijri academic-year range and stores its starting year', async () => {
    const http = renderYears();
    await userEvent.click(await screen.findByRole('button', { name: 'إضافة عام دراسي' }));
    // The user types the two-year span; non-digits are stripped, the slash is
    // auto-inserted, and the API stores the starting year.
    await userEvent.type(screen.getByLabelText('العام الدراسي (هجري)'), '1447a1448');
    await userEvent.click(screen.getByRole('button', { name: 'حفظ' }));

    await waitFor(() => expect(http.countOf('POST /academic-years')).toBe(1));
    const post = http.calls.find((c) => c.method === 'POST' && c.path === '/academic-years');
    expect(post?.body).toEqual({ hijriYear: 1447 });
  });
});
