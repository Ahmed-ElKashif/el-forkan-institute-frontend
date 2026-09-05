// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { TimetableEditorPage } from './TimetableEditorPage';
import type { Subject } from '../catalogue';
import type { User } from '../users';
import { makeStore } from '../../shared/api/store';
import { toQueryString, type Page } from '../../shared/api/pagination';
import { HttpError } from '../../shared/http/http.errors';
import { stubHttpClient, type StubRoutes } from '../../test/stub-http-client';
import '../../shared/i18n';

/* Proves the two things that matter on this screen: a slot is created with the
   chosen subject and time, and the server's teacher-clash refusal (409) is shown
   to the head teacher rather than swallowed. Real store and grid against a stub. */

const SECTION = { id: 'sec1', name: 'المستوى الأول - بنين', gender: 'male', levelId: 1, academicYearId: 10 };
const SUBJECT: Subject = { id: 1, code: 'ARABIC', nameAr: 'اللغة العربية', shortNameAr: null, nameEn: null, isActive: true, aliases: [] };
const TEACHER: User = { id: 'u1', fullName: 'أحمد المعلّم', username: 'ahmed', gender: 'male', role: 'teacher', branchId: null, phone: '0100', email: null, isActive: true };
const CREATED_SLOT = { id: 'slot9', sectionId: 'sec1', subjectId: 1, subjectNameAr: 'اللغة العربية', teacherId: null, teacherName: null, weekday: 5, slotOrder: 1, startsAt: '08:00', endsAt: '09:00', room: null, mode: 'onsite', effectiveFrom: null, effectiveTo: null };

const subjectsKey = `GET /subjects?${toQueryString({ page: 1, pageSize: 100 })}`;
const teachersKey = `GET /users?${toQueryString({ page: 1, pageSize: 100, role: 'teacher' })}`;

function page<T>(items: T[]): Page<T> {
  return { items, total: items.length, page: 1, pageSize: 100 };
}

function renderEditor(routes: StubRoutes) {
  const http = stubHttpClient({
    'GET /sections/sec1': SECTION,
    'GET /sections/sec1/timetable': [],
    [subjectsKey]: page([SUBJECT]),
    [teachersKey]: page([TEACHER]),
    ...routes,
  });
  render(
    <Provider store={makeStore(http)}>
      <MemoryRouter initialEntries={['/timetable/sec1']}>
        <Routes>
          <Route path="/timetable/:sectionId" element={<TimetableEditorPage />} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
  return http;
}

afterEach(cleanup);

/** Open the add-slot dialog and fill the required subject and times. */
async function openAndFillSlot() {
  await screen.findByText('لا توجد حصص في هذا الفصل بعد.');
  await userEvent.click(screen.getByRole('button', { name: 'إضافة حصة' }));
  await screen.findByRole('option', { name: 'اللغة العربية' });
  await userEvent.selectOptions(screen.getByRole('combobox', { name: 'المادة' }), '1');
  fireEvent.change(screen.getByLabelText('من'), { target: { value: '08:00' } });
  fireEvent.change(screen.getByLabelText('إلى'), { target: { value: '09:00' } });
}

describe('TimetableEditorPage', () => {
  it('adds a slot with the chosen subject and time', async () => {
    const http = renderEditor({ 'POST /sections/sec1/timetable': CREATED_SLOT });
    await openAndFillSlot();
    await userEvent.click(screen.getByRole('button', { name: 'حفظ' }));

    await waitFor(() => expect(http.countOf('POST /sections/sec1/timetable')).toBe(1));
    const create = http.calls.find((c) => c.method === 'POST' && c.path === '/sections/sec1/timetable');
    expect(create?.body).toMatchObject({ subjectId: 1, weekday: 5, startsAt: '08:00', endsAt: '09:00', teacherId: null, mode: 'onsite' });
  });

  it('shows the clash message when the server rejects a teacher double-booking', async () => {
    renderEditor({
      'POST /sections/sec1/timetable': () => {
        throw new HttpError(409, { message: 'This teacher is already scheduled that day' });
      },
    });
    await openAndFillSlot();
    await userEvent.click(screen.getByRole('button', { name: 'حفظ' }));

    await screen.findByText('هذا المعلّم لديه حصة أخرى في هذا اليوم تتداخل مع هذا الوقت. غيّر المعلّم أو الوقت.');
  });
});
