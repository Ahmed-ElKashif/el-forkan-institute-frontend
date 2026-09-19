// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { CurriculumPage } from './CurriculumPage';
import type { CurriculumTreeNode } from './curriculum.model';
import type { Book, Subject } from '../catalogue';
import { makeStore } from '../../shared/api/store';
import { toQueryString, type Page } from '../../shared/api/pagination';
import { stubHttpClient, type StubRoutes } from '../../test/stub-http-client';
import '../../shared/i18n';

/* The plan's three writes, and the one that used to be impossible.

   «تقسيم المادة إلى فروع» is the headline: the server refuses a فرع under an
   examinable مادة, and every مادة is examinable by default, so the old "إضافة
   فرع" failed on every subject it was offered on. It is one action now — convert
   the parent, then add the فرع — so the PATCH that converts is what this pins.

   «إضافة كتاب» must save with only a book chosen: `syllabus_scope_ar` is NOT
   NULL server-side, so the dialog defaults it rather than demanding it. */

const SUBJECT: Subject = { id: 1, code: 'S001', nameAr: 'الفقه', shortNameAr: null, nameEn: null, isActive: true, aliases: [] };
const BOOK: Book = { id: 1, titleAr: 'الروض المربع', authorAr: null, notes: null, isActive: true };

const ROW: CurriculumTreeNode = {
  id: 10, academicYearId: 1, levelId: 1, termNumber: 1, subjectId: 1, subjectNameAr: 'الفقه',
  parentCurriculumId: null, isExaminable: true, isMandatory: true, gradingMode: 'score', assessmentType: 'written',
  maxScore: 100, passScore: 50, weight: 1, teachingOrder: 1, units: [], children: [],
};

const subjectsKey = `GET /subjects?${toQueryString({ page: 1, pageSize: 100 })}`;
const booksKey = `GET /books?${toQueryString({ page: 1, pageSize: 100 })}`;
const treeKey = `GET /academic-years/1/curriculum?${toQueryString({ levelId: 1, termNumber: 1 })}`;
const examsKey = `GET /exams?${toQueryString({ levelId: 1, page: 1, pageSize: 100 })}`;

function page<T>(items: T[]): Page<T> {
  return { items, total: items.length, page: 1, pageSize: 100 };
}

function renderPlan(routes: StubRoutes, readOnly = false) {
  const http = stubHttpClient({
    [subjectsKey]: page([SUBJECT]),
    [booksKey]: page([BOOK]),
    [examsKey]: page([]),
    [treeKey]: [],
    ...routes,
  });
  render(
    <Provider store={makeStore(http)}>
      <CurriculumPage scope={{ yearId: 1, levelId: 1, termNumber: 1 }} readOnly={readOnly} />
    </Provider>,
  );
  return http;
}

async function openRowMenu() {
  await userEvent.click(screen.getByRole('button', { name: 'إجراءات' }));
}

afterEach(cleanup);

describe('CurriculumPage', () => {
  it('adds a top-level subject with the scope’s term', async () => {
    const http = renderPlan({ 'POST /academic-years/1/levels/1/curriculum': { ...ROW, id: 99 } });
    await screen.findByText('لا توجد مواد في هذا المستوى والفصل بعد.');

    await userEvent.click(screen.getByRole('button', { name: 'إضافة مادة' }));
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'المادة' }), '1');
    await userEvent.click(screen.getByRole('button', { name: 'حفظ' }));

    await waitFor(() => expect(http.countOf('POST /academic-years/1/levels/1/curriculum')).toBe(1));
    const create = http.calls.find((c) => c.method === 'POST' && c.path === '/academic-years/1/levels/1/curriculum');
    expect(create?.body).toMatchObject({ subjectId: 1, termNumber: 1, parentCurriculumId: null, isExaminable: true });
  });

  it('prescribes a book with nothing but the book chosen', async () => {
    const http = renderPlan({
      [treeKey]: [ROW],
      'POST /curriculum/10/units': { id: 5, bookId: 1, bookTitleAr: 'الروض المربع', unitLabel: null, syllabusScopeAr: 'كامل الكتاب', alternativeGroup: null, sortOrder: 1 },
    });
    await screen.findByText('الفقه');

    await openRowMenu();
    await userEvent.click(screen.getByRole('menuitem', { name: 'إضافة كتاب' }));
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'الكتاب' }), '1');
    await userEvent.click(screen.getByRole('button', { name: 'حفظ' }));

    await waitFor(() => expect(http.countOf('POST /curriculum/10/units')).toBe(1));
    const add = http.calls.find((c) => c.method === 'POST' && c.path === '/curriculum/10/units');
    // The scope defaults rather than blocking the save, and the sort order is
    // assigned so two books cannot collide on the unique (curriculum, sort_order).
    expect(add?.body).toMatchObject({ bookId: 1, syllabusScopeAr: 'كامل الكتاب', sortOrder: 1 });
  });

  it('splits an examinable subject by converting it first, then opening the فرع', async () => {
    const http = renderPlan({
      [treeKey]: [ROW],
      'PATCH /curriculum/10': { ...ROW, isExaminable: false },
    });
    await screen.findByText('الفقه');

    await openRowMenu();
    await userEvent.click(screen.getByRole('menuitem', { name: 'تقسيم إلى فروع' }));
    await userEvent.click(screen.getByRole('button', { name: 'تقسيم إلى فروع' }));

    // The conversion the server demands, which the old flow never performed.
    await waitFor(() => expect(http.countOf('PATCH /curriculum/10')).toBe(1));
    const patch = http.calls.find((c) => c.method === 'PATCH' && c.path === '/curriculum/10');
    expect((patch?.body as { isExaminable?: boolean } | undefined)?.isExaminable).toBe(false);

    // …and the فرع dialog follows, parented to the subject just converted.
    expect(await screen.findByText('إضافة فرع إلى الفقه')).toBeDefined();
  });

  it('does not ask to convert a subject that is already a container', async () => {
    const container = { ...ROW, isExaminable: false };
    const http = renderPlan({ [treeKey]: [container] });
    await screen.findByText('الفقه');

    await openRowMenu();
    await userEvent.click(screen.getByRole('menuitem', { name: 'تقسيم إلى فروع' }));

    expect(await screen.findByText('إضافة فرع إلى الفقه')).toBeDefined();
    expect(http.countOf('PATCH /curriculum/10')).toBe(0);
  });

  /* The plan has one owner. The level hub embeds this same component to *show* a
     level's syllabus, and the read-only pass is what stops it being a second
     place to edit the institute's record. */
  it('read-only shows the plan with no way to change it', async () => {
    renderPlan({ [treeKey]: [ROW] }, true);
    await screen.findByText('الفقه');

    // The syllabus itself still reads in full.
    expect(screen.getByText('العظمى 100.00 · النجاح 50.00')).toBeDefined();
    // …but every entry point to a write is gone, the row menu included.
    expect(screen.queryByRole('button', { name: 'إضافة مادة' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'إجراءات' })).toBeNull();
  });

  /* The subject picker used to be a dead end: a مادة the institute had not
     registered yet could only be created from another screen. */
  it('creates a subject from inside the add-subject form and selects it', async () => {
    const created: Subject = { ...SUBJECT, id: 2, nameAr: 'النحو' };
    const http = renderPlan({
      'POST /subjects': created,
      'POST /academic-years/1/levels/1/curriculum': { ...ROW, id: 99 },
    });
    await screen.findByText('لا توجد مواد في هذا المستوى والفصل بعد.');

    await userEvent.click(screen.getByRole('button', { name: 'إضافة مادة' }));
    await userEvent.click(screen.getByRole('button', { name: 'مادة جديدة' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'الاسم بالعربية' }), 'النحو');
    await userEvent.click(screen.getByRole('button', { name: 'حفظ' }));

    await waitFor(() => expect(http.countOf('POST /subjects')).toBe(1));

    // Back on the row form with the new subject already chosen — the fields
    // filled in before the detour survive, so saving needs no re-entry.
    await userEvent.click(await screen.findByRole('button', { name: 'حفظ' }));
    await waitFor(() => expect(http.countOf('POST /academic-years/1/levels/1/curriculum')).toBe(1));
    const create = http.calls.find((c) => c.method === 'POST' && c.path === '/academic-years/1/levels/1/curriculum');
    expect(create?.body).toMatchObject({ subjectId: 2 });
  });
});
