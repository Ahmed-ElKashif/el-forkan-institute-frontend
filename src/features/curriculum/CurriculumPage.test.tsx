// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { CurriculumPage } from './CurriculumPage';
import type { CurriculumTreeNode } from './curriculum.model';
import type { AcademicYear } from '../../shared/api/calendar';
import type { Book, Level, Subject } from '../catalogue';
import { makeStore } from '../../shared/api/store';
import { toQueryString, type Page } from '../../shared/api/pagination';
import { stubHttpClient, type StubRoutes } from '../../test/stub-http-client';
import '../../shared/i18n';

/* Proves the curriculum builder's two core writes: adding a top-level مادة posts
   the subject with the current term, and adding a unit posts its scope under the
   right row. Real store and tree against a stub. */

const YEAR: AcademicYear = { id: 1, hijriYear: 1447, startsOn: '2026-04-03', endsOn: '2027-01-23', status: 'active', terms: [] };
const LEVEL: Level = { id: 1, code: 'L1', nameAr: 'المستوى الأول', sortOrder: 1, isOptional: false, isTerminal: false, allowsCarry: true, grantsCertificate: false, requiresCleanEntry: false };
const SUBJECT: Subject = { id: 1, code: 'ARABIC', nameAr: 'اللغة العربية', shortNameAr: null, nameEn: null, isActive: true, aliases: [] };
const BOOK: Book = { id: 1, titleAr: 'النحو الواضح', authorAr: null, notes: null, isActive: true };

const ROW: CurriculumTreeNode = {
  id: 10, academicYearId: 1, levelId: 1, termNumber: 1, subjectId: 1, subjectNameAr: 'اللغة العربية',
  parentCurriculumId: null, isExaminable: true, isMandatory: true, gradingMode: 'score', assessmentType: 'written',
  maxScore: 100, passScore: 50, weight: 1, teachingOrder: 1, units: [], children: [],
};

const yearsKey = `GET /academic-years?${toQueryString({ page: 1, pageSize: 100 })}`;
const subjectsKey = `GET /subjects?${toQueryString({ page: 1, pageSize: 100 })}`;
const booksKey = `GET /books?${toQueryString({ page: 1, pageSize: 100 })}`;
const treeKey = `GET /academic-years/1/curriculum?${toQueryString({ levelId: 1, termNumber: 1 })}`;

function page<T>(items: T[]): Page<T> {
  return { items, total: items.length, page: 1, pageSize: 100 };
}

function renderCurriculum(routes: StubRoutes) {
  const http = stubHttpClient({
    [yearsKey]: page([YEAR]),
    'GET /levels': [LEVEL],
    [subjectsKey]: page([SUBJECT]),
    [booksKey]: page([BOOK]),
    [treeKey]: [],
    ...routes,
  });
  render(
    <Provider store={makeStore(http)}>
      <CurriculumPage />
    </Provider>,
  );
  return http;
}

afterEach(cleanup);

describe('CurriculumPage', () => {
  it('adds a top-level subject with the current term', async () => {
    const http = renderCurriculum({ 'POST /academic-years/1/levels/1/curriculum': { ...ROW, id: 99 } });
    await screen.findByText('لا توجد مواد في هذا المستوى والفصل بعد.');

    await userEvent.click(screen.getByRole('button', { name: 'إضافة مادة' }));
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'المادة' }), '1');
    await userEvent.click(screen.getByRole('button', { name: 'حفظ' }));

    await waitFor(() => expect(http.countOf('POST /academic-years/1/levels/1/curriculum')).toBe(1));
    const create = http.calls.find((c) => c.method === 'POST' && c.path === '/academic-years/1/levels/1/curriculum');
    expect(create?.body).toMatchObject({ subjectId: 1, termNumber: 1, parentCurriculumId: null });
  });

  it('adds a unit under a row', async () => {
    const http = renderCurriculum({ [treeKey]: [ROW], 'POST /curriculum/10/units': { id: 5, bookId: null, bookTitleAr: null, unitLabel: null, syllabusScopeAr: 'باب', alternativeGroup: null, sortOrder: 1 } });
    await screen.findByText('اللغة العربية');

    await userEvent.click(screen.getByRole('button', { name: 'إضافة وحدة' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'نطاق الدراسة' }), 'من أول الكتاب إلى باب الفاعل');
    await userEvent.click(screen.getByRole('button', { name: 'حفظ' }));

    await waitFor(() => expect(http.countOf('POST /curriculum/10/units')).toBe(1));
    const add = http.calls.find((c) => c.method === 'POST' && c.path === '/curriculum/10/units');
    expect((add?.body as { syllabusScopeAr?: string } | undefined)?.syllabusScopeAr).toBe('من أول الكتاب إلى باب الفاعل');
  });
});
