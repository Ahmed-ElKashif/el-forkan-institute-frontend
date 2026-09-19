// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { ClassDayDialog } from './ClassDayDialog';
import type { Subject } from '../catalogue';
import { makeStore } from '../../shared/api/store';
import { toQueryString, type Page } from '../../shared/api/pagination';
import { stubHttpClient, type StubRoutes } from '../../test/stub-http-client';
import '../../shared/i18n';

/* The dialog shapes a class day the server can fan out: each period carries its
   own slotOrder, and an empty sheikh name becomes null. This proves the posted
   body, which is the dialog's whole job. */

/* The date field is a Hijri DatePicker, so the dialog opens on «the coming
   Friday» rather than on a date a test can type into. Pinning that default is
   what keeps the posted body deterministic — the picker's own contract (Hijri
   in, Gregorian YYYY-MM-DD out) is covered in ds/forms/DatePicker.test.tsx. */
vi.mock('./class-day-dates', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./class-day-dates')>()),
  nextFridayIso: () => '2026-09-18',
}));

const SUBJECT: Subject = { id: 1, code: 'ARABIC', nameAr: 'اللغة العربية', shortNameAr: null, nameEn: null, isActive: true, aliases: [] };
const subjectsKey = `GET /subjects?${toQueryString({ page: 1, pageSize: 100 })}`;

function page<T>(items: T[]): Page<T> {
  return { items, total: items.length, page: 1, pageSize: 100 };
}

function renderDialog(routes: StubRoutes = {}) {
  const http = stubHttpClient({ [subjectsKey]: page([SUBJECT]), ...routes });
  render(
    <Provider store={makeStore(http)}>
      <ClassDayDialog levelId={2} academicYearId={1} onClose={() => {}} onSaved={() => {}} />
    </Provider>,
  );
  return http;
}

afterEach(cleanup);

describe('ClassDayDialog', () => {
  it('posts a class day with per-period slotOrder and a null sheikh when blank', async () => {
    const http = renderDialog({ 'POST /levels/2/class-days': { created: 2, skipped: 0 } });
    await screen.findByRole('option', { name: 'اللغة العربية' });

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'المادة' }), '1');
    fireEvent.change(screen.getByLabelText('من'), { target: { value: '16:00' } });
    fireEvent.change(screen.getByLabelText('إلى'), { target: { value: '17:00' } });
    await userEvent.click(screen.getByRole('button', { name: 'حفظ' }));

    await waitFor(() => expect(http.countOf('POST /levels/2/class-days')).toBe(1));
    const post = http.calls.find((c) => c.method === 'POST' && c.path === '/levels/2/class-days');
    expect(post?.body).toEqual({
      academicYearId: 1,
      sessionDate: '2026-09-18',
      periods: [
        { subjectId: 1, slotOrder: 1, startsAt: '16:00', endsAt: '17:00', sheikhName: null, genderScope: 'both' },
      ],
    });
  });
});
