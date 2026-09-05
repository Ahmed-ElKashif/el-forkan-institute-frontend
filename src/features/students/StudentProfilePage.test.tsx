// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { StudentProfilePage } from './StudentProfilePage';
import { AuthGateway, AuthProvider, AuthService, MemoryTokenStore, type AuthUser } from '../auth';
import { DiProvider } from '../../shared/di/DiProvider';
import { makeStore } from '../../shared/api/store';
import { toQueryString } from '../../shared/api/pagination';
import { stubHttpClient, type StubRoutes } from '../../test/stub-http-client';
import '../../shared/i18n';

/* The profile composes five independent reads (record + four panels) behind the
   real auth seam and store. These prove the identity and academic record render
   from those reads, and that an unreachable student shows the not-found state
   rather than a blank frame — the panels never fire in that case. */

const HEAD: AuthUser = {
  id: 'h1',
  fullName: 'محمود عبد الله',
  username: 'headteacher',
  gender: 'male',
  role: 'head_teacher',
  branchId: 1,
  phone: '+201000000000',
  email: null,
  isActive: true,
};

const STUDENT = {
  id: 's1',
  studentCode: '2026-0007',
  fullName: 'أحمد سالم عبد الله',
  gender: 'male',
  branchId: 1,
  phone: '+201000000001',
  whatsappPhone: null,
  governorateId: null,
  markazId: null,
  address: 'أسوان',
  birthDate: '2008-05-01',
  hasNationalId: true,
  status: 'active',
  whatsappOptIn: true,
  notes: null,
};

const PROFILE_ROUTES: StubRoutes = {
  'GET /students/s1': STUDENT,
  'GET /students/s1/enrollments': [
    { id: 'e1', academicYearId: 5, hijriYear: 1447, status: 'active', entryType: 'new', isHistorical: false, sectionId: 'sec1', sectionName: 'قسم أ', levelId: 2, levelName: 'المستوى الأول' },
  ],
  'GET /students/s1/attendance': {
    present: 10,
    absent: 4,
    late: 1,
    excused: 0,
    total: 15,
    recent: [{ sessionDate: '2026-08-20', mode: 'onsite', sectionName: 'قسم أ', subjectName: 'النحو', status: 'late', attendedMode: 'onsite', minutesLate: 5 }],
    // Over the limit this term → the absence banner + warn button show.
    position: { absences: 4, warnAt: 3, maxAbsences: 4, risk: 'over', warningSentAt: null },
  },
  'GET /students/s1/exam-results': [
    { id: 'r1', subjectName: 'الفقه', termNumber: 1, examType: 'term_1', score: 85, maxScore: 100, passScore: 50, isAbsent: false, result: 'pass' },
  ],
  'GET /students/s1/placements': [
    { id: 'p1', method: 'entrance_exam', score: 40, maxScore: 50, passScore: 25, isPassed: true, placedLevelId: 2, assessedOn: '2026-06-01', notes: null },
  ],
  // The info card resolves governorate/markaz names; this student has neither,
  // so an empty list is enough and the markaz read is skipped.
  'GET /governorates?page=1&pageSize=100': { items: [], total: 0, page: 1, pageSize: 100 },
  // The header resolves the study year against the current year (id 5, matching
  // the enrollment stub above).
  'GET /academic-years?page=1&pageSize=1': { items: [{ id: 5, hijriYear: 1447 }], total: 1, page: 1, pageSize: 1 },
};

/** A working refresh + /users/me, so `AuthProvider.restore()` lands on `user`. */
function authRoutes(user: AuthUser): StubRoutes {
  return {
    'GET /auth/refresh/csrf-token': { csrfToken: 'x' },
    'POST /auth/refresh': { accessToken: 'a' },
    'GET /users/me': user,
  };
}

function renderProfile(studentId: string, routes: StubRoutes) {
  const http = stubHttpClient({ ...authRoutes(HEAD), ...routes });
  const container = { auth: new AuthService(new AuthGateway(http), new MemoryTokenStore()), http };
  render(
    <DiProvider container={container}>
      <Provider store={makeStore(http)}>
        <AuthProvider>
          <MemoryRouter initialEntries={[`/students/${studentId}`]}>
            <Routes>
              <Route path="/students/:id" element={<StudentProfilePage />} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </Provider>
    </DiProvider>,
  );
  return http;
}

afterEach(cleanup);

describe('StudentProfilePage', () => {
  it('renders the student’s identity, contact and academic record', async () => {
    renderProfile('s1', PROFILE_ROUTES);

    // Identity + contact from the record read.
    expect(await screen.findByText('أحمد سالم عبد الله')).toBeDefined();
    expect(screen.getByText('+201000000001')).toBeDefined();
    // Academic record from three separate panels.
    expect(await screen.findByText('حاضر')).toBeDefined(); // attendance tally label
    expect(await screen.findByText('الفقه')).toBeDefined(); // exam-result subject
    expect(await screen.findByText('entrance_exam')).toBeDefined(); // placement method
  });

  it('shows the not-found state for a student it cannot reach', async () => {
    // Only auth is stubbed, so the record read rejects and the panels never run.
    renderProfile('missing', {});

    expect(await screen.findByText('الطالب غير موجود')).toBeDefined();
  });

  it('edits the record and PATCHes the changed name', async () => {
    const http = renderProfile('s1', {
      ...PROFILE_ROUTES,
      'PATCH /students/s1': { ...STUDENT, fullName: 'أحمد سالم عبد الرحمن' },
    });
    const user = userEvent.setup();
    await screen.findByText('أحمد سالم عبد الله');

    await user.click(screen.getByRole('button', { name: 'تعديل' }));
    const nameInput = await screen.findByLabelText('الاسم الكامل');
    await user.clear(nameInput);
    await user.type(nameInput, 'أحمد سالم عبد الرحمن');
    await user.click(screen.getByRole('button', { name: 'حفظ' }));

    await waitFor(() => expect(http.countOf('PATCH /students/s1')).toBe(1));
    const patch = http.calls.find((c) => c.method === 'PATCH' && c.path === '/students/s1');
    expect((patch?.body as { fullName?: string } | undefined)?.fullName).toBe('أحمد سالم عبد الرحمن');
  });

  it('assigns a study year to a student who has none', async () => {
    const sectionsKey = `GET /sections?${toQueryString({ academicYearId: 1, page: 1, pageSize: 100 })}`;
    const http = renderProfile('s1', {
      ...PROFILE_ROUTES,
      // No enrollment → the header shows the "assign year" button (legacy case).
      'GET /students/s1/enrollments': [],
      'GET /academic-years?page=1&pageSize=1': { items: [{ id: 1, hijriYear: 1447 }], total: 1, page: 1, pageSize: 1 },
      'GET /levels': [{ id: 1, code: 'L1', nameAr: 'المستوى الأول', sortOrder: 2, isOptional: false, isTerminal: false, allowsCarry: true, grantsCertificate: true, requiresCleanEntry: false }],
      [sectionsKey]: { items: [{ id: 'sec1', name: 'قسم أ', gender: 'male', levelId: 1, defaultMode: 'onsite', enrolledCount: 0, capacity: null, teachers: [] }], total: 1, page: 1, pageSize: 100 },
      'POST /enrollments': { id: 'en1' },
    });
    const user = userEvent.setup();
    await screen.findByText('أحمد سالم عبد الله');

    await user.click(await screen.findByRole('button', { name: 'تعيين السنة الدراسية' }));
    await user.selectOptions(await screen.findByRole('combobox'), 'sec1');
    await user.click(screen.getByRole('button', { name: 'حفظ' }));

    await waitFor(() => expect(http.countOf('POST /enrollments')).toBe(1));
    const post = http.calls.find((c) => c.method === 'POST' && c.path === '/enrollments');
    expect(post?.body).toMatchObject({ studentId: 's1', sectionId: 'sec1' });
  });

  it('transfers a wrongly-imported year to the correct section', async () => {
    const sectionsKey = `GET /sections?${toQueryString({ academicYearId: 5, page: 1, pageSize: 100 })}`;
    const http = renderProfile('s1', {
      ...PROFILE_ROUTES,
      'GET /levels': [{ id: 2, code: 'L2', nameAr: 'المستوى الثاني', sortOrder: 3, isOptional: false, isTerminal: false, allowsCarry: true, grantsCertificate: true, requiresCleanEntry: false }],
      [sectionsKey]: { items: [{ id: 'sec2', name: 'قسم ب', gender: 'male', levelId: 2, defaultMode: 'onsite', enrolledCount: 0, capacity: null, teachers: [] }], total: 1, page: 1, pageSize: 100 },
      'POST /enrollments/e1/transfer': { id: 'e1' },
    });
    const user = userEvent.setup();
    await screen.findByText('أحمد سالم عبد الله');

    // The student has a year (from the enrollment stub), so the header offers an
    // edit that transfers the existing enrollment rather than creating one.
    await user.click(await screen.findByRole('button', { name: 'تعديل السنة الدراسية' }));
    await user.selectOptions(await screen.findByRole('combobox'), 'sec2');
    await user.click(screen.getByRole('button', { name: 'حفظ' }));

    await waitFor(() => expect(http.countOf('POST /enrollments/e1/transfer')).toBe(1));
    const post = http.calls.find((c) => c.method === 'POST' && c.path === '/enrollments/e1/transfer');
    expect(post?.body).toMatchObject({ sectionId: 'sec2' });
  });

  it('sends the WhatsApp absence warning from the at-risk banner', async () => {
    const http = renderProfile('s1', {
      ...PROFILE_ROUTES,
      'POST /students/s1/absence-warning': { status: 'sent', absences: 4, threshold: 4 },
    });
    const user = userEvent.setup();
    await screen.findByText('أحمد سالم عبد الله');

    await user.click(await screen.findByRole('button', { name: 'إرسال تحذير عبر واتساب' }));

    await waitFor(() => expect(http.countOf('POST /students/s1/absence-warning')).toBe(1));
  });
});
