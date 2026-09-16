// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { EditPeriodDialog } from './EditPeriodDialog';
import type { Subject } from '../catalogue';
import type { Session } from './session.model';
import { makeStore } from '../../shared/api/store';
import { toQueryString, type Page } from '../../shared/api/pagination';
import { stubHttpClient, type StubRoutes } from '../../test/stub-http-client';
import '../../shared/i18n';

/* Editing a period patches only its subject, times and sheikh — scope is fixed
   at creation. This proves the PATCH body. */

const SUBJECTS: Subject[] = [
  { id: 1, code: 'QURAN', nameAr: 'القرآن', shortNameAr: null, nameEn: null, isActive: true, aliases: [] },
  { id: 2, code: 'TAFSIR', nameAr: 'التفسير', shortNameAr: null, nameEn: null, isActive: true, aliases: [] },
];

const SESSION: Session = {
  id: 'sess1', subjectId: 1, subjectNameAr: 'القرآن', sheikhName: 'الشيخ أحمد', sessionNo: 1,
  sessionDate: '2099-09-18', startsAt: '16:00:00', endsAt: '17:00:00', mode: 'onsite',
  room: null, meetingUrl: null, status: 'scheduled', cancelReason: null,
};

const subjectsKey = `GET /subjects?${toQueryString({ page: 1, pageSize: 100 })}`;
function page<T>(items: T[]): Page<T> {
  return { items, total: items.length, page: 1, pageSize: 100 };
}

const ROUTES: StubRoutes = {
  [subjectsKey]: page(SUBJECTS),
  'PATCH /sessions/sess1': { ...SESSION, subjectId: 2, subjectNameAr: 'التفسير' },
};

function renderDialog() {
  const http = stubHttpClient(ROUTES);
  render(
    <Provider store={makeStore(http)}>
      <EditPeriodDialog session={SESSION} onClose={() => {}} onSaved={() => {}} />
    </Provider>,
  );
  return http;
}

afterEach(cleanup);

describe('EditPeriodDialog', () => {
  it('patches the period with the changed subject, keeping its times', async () => {
    const http = renderDialog();
    await screen.findByRole('option', { name: 'التفسير' });

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'المادة' }), '2');
    await userEvent.click(screen.getByRole('button', { name: 'حفظ' }));

    await waitFor(() => expect(http.countOf('PATCH /sessions/sess1')).toBe(1));
    const patch = http.calls.find((c) => c.method === 'PATCH' && c.path === '/sessions/sess1');
    expect(patch?.body).toEqual({
      subjectId: 2,
      startsAt: '16:00',
      endsAt: '17:00',
      sheikhName: 'الشيخ أحمد',
    });
  });
});
