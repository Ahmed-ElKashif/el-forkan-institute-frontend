// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { CataloguePage } from './CataloguePage';
import type { Book, Level, Subject } from './catalogue.model';
import { makeStore } from '../../shared/api/store';
import { toQueryString, type Page } from '../../shared/api/pagination';
import { stubHttpClient, type StubRoutes } from '../../test/stub-http-client';
import { HttpError } from '../../shared/http/http.errors';
import '../../shared/i18n';

/* The study plan's shell: one scope (العام · المستوى · الفصل) that every tab is
   read against, with the plan itself as the front door rather than a lookup
   table. The registries still write correctly behind it.

   The scope test is the point of the redesign: before it, each tab scoped
   itself, so "the books of level 2, term 1" was not a question this screen could
   be asked. */

const LEVEL_1: Level = { id: 1, code: 'L1', nameAr: 'المستوى الأول', sortOrder: 1, isOptional: false, isTerminal: false, allowsCarry: true, grantsCertificate: false, requiresCleanEntry: false };
const LEVEL_2: Level = { ...LEVEL_1, id: 2, code: 'L2', nameAr: 'المستوى الثاني', sortOrder: 2 };
const SUBJECT: Subject = { id: 1, code: 'S001', nameAr: 'اللغة العربية', shortNameAr: null, nameEn: null, isActive: true, aliases: [] };
const BOOK: Book = { id: 1, titleAr: 'النحو الواضح', authorAr: 'علي الجارم', notes: null, isActive: true };

const yearsKey = `GET /academic-years?${toQueryString({ page: 1, pageSize: 100 })}`;
const subjectsPageKey = `GET /subjects?${toQueryString({ page: 1, pageSize: 25 })}`;
const booksPageKey = `GET /books?${toQueryString({ page: 1, pageSize: 25 })}`;
const subjectOptionsKey = `GET /subjects?${toQueryString({ page: 1, pageSize: 100 })}`;
const bookOptionsKey = `GET /books?${toQueryString({ page: 1, pageSize: 100 })}`;

function treeKey(levelId: number, termNumber = 1) {
  return `GET /academic-years/1/curriculum?${toQueryString({ levelId, termNumber })}`;
}
function examsKey(levelId: number) {
  return `GET /exams?${toQueryString({ levelId, page: 1, pageSize: 100 })}`;
}

function page<T>(items: T[]): Page<T> {
  return { items, total: items.length, page: 1, pageSize: 25 };
}

function renderCatalogue(routes: StubRoutes = {}, entry = '/catalogue') {
  const http = stubHttpClient({
    [yearsKey]: page([{ id: 1, hijriYear: 1447, startsOn: '2026-04-03', endsOn: '2027-01-23', status: 'active', terms: [] }]),
    'GET /levels': [LEVEL_1, LEVEL_2],
    [subjectsPageKey]: page([SUBJECT]),
    [booksPageKey]: page([BOOK]),
    [subjectOptionsKey]: page([SUBJECT]),
    [bookOptionsKey]: page([BOOK]),
    [treeKey(1)]: [],
    [treeKey(2)]: [],
    [examsKey(1)]: page([]),
    [examsKey(2)]: page([]),
    ...routes,
  });
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Provider store={makeStore(http)}>
        <CataloguePage />
      </Provider>
    </MemoryRouter>,
  );
  return http;
}

afterEach(cleanup);

describe('CataloguePage — the study plan', () => {
  it('opens on the plan, not on a lookup table', async () => {
    renderCatalogue();
    expect(await screen.findByRole('tab', { name: 'المقررات', selected: true })).toBeDefined();
  });

  it('reads every tab against one scope: changing the level re-reads the plan', async () => {
    const http = renderCatalogue();
    await screen.findByRole('tab', { name: 'المقررات', selected: true });
    await waitFor(() => expect(http.countOf(treeKey(1))).toBe(1));

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'المستوى' }), '2');

    await waitFor(() => expect(http.countOf(treeKey(2))).toBe(1));
  });

  it('creates a subject from the registry', async () => {
    const http = renderCatalogue({ 'POST /subjects': { ...SUBJECT, id: 2 } });
    await userEvent.click(await screen.findByRole('tab', { name: 'المواد' }));
    await screen.findByText('اللغة العربية');

    await userEvent.click(screen.getByRole('button', { name: 'مادة جديدة' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'الاسم بالعربية' }), 'الرياضيات');
    await userEvent.click(screen.getByRole('button', { name: 'حفظ' }));

    await waitFor(() => expect(http.countOf('POST /subjects')).toBe(1));
    const create = http.calls.find((c) => c.method === 'POST' && c.path === '/subjects');
    // No code is sent any more — nothing reads it, so the server names it.
    expect(create?.body).toEqual({ nameAr: 'الرياضيات' });
  });

  it('deletes a subject that nothing has used', async () => {
    const http = renderCatalogue({ 'DELETE /subjects/1': null });
    await userEvent.click(await screen.findByRole('tab', { name: 'المواد' }));
    await screen.findByText('اللغة العربية');

    await userEvent.click(screen.getByRole('button', { name: 'إجراءات' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'حذف المادة' }));
    await userEvent.click(screen.getByRole('button', { name: 'حذف المادة' }));

    await waitFor(() => expect(http.countOf('DELETE /subjects/1')).toBe(1));
  });

  it('explains, rather than just failing, when the subject is in use', async () => {
    /* A taught subject is held by curriculum rows, sessions and carried
       subjects (ON DELETE RESTRICT), so the API refuses with 409. The head
       teacher needs to be told to deactivate it — not shown a failed action. */
    const http = renderCatalogue({
      'DELETE /subjects/1': () => {
        throw new HttpError(409, { message: 'This subject is in use and cannot be deleted' });
      },
    });
    await userEvent.click(await screen.findByRole('tab', { name: 'المواد' }));
    await screen.findByText('اللغة العربية');

    await userEvent.click(screen.getByRole('button', { name: 'إجراءات' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'حذف المادة' }));
    await userEvent.click(screen.getByRole('button', { name: 'حذف المادة' }));

    await waitFor(() => expect(http.countOf('DELETE /subjects/1')).toBe(1));
    expect(await screen.findByText(/عطّلها بدلًا من ذلك/)).toBeDefined();
  });

  it("edits a level's flags", async () => {
    const http = renderCatalogue({ 'PATCH /levels/1': { ...LEVEL_1, isOptional: true } });
    await userEvent.click(await screen.findByRole('tab', { name: 'المستويات والقواعد' }));
    // Scoped to the table: the scope bar's level picker holds an <option> with
    // the same text, and clicking that would open nothing.
    const table = await screen.findByRole('table');
    await userEvent.click(within(table).getByText('المستوى الأول'));
    await userEvent.click(screen.getByRole('switch', { name: 'اختياري' }));
    await userEvent.click(screen.getByRole('button', { name: 'حفظ' }));

    await waitFor(() => expect(http.countOf('PATCH /levels/1')).toBe(1));
    const patch = http.calls.find((c) => c.method === 'PATCH' && c.path === '/levels/1');
    expect((patch?.body as { isOptional?: boolean } | undefined)?.isOptional).toBe(true);
  });

  it('creates a book in the institute-wide registry', async () => {
    const http = renderCatalogue({ 'POST /books': { ...BOOK, id: 2 } });
    await userEvent.click(await screen.findByRole('tab', { name: 'الكتب والمتون' }));
    await screen.findByText('النحو الواضح');

    await userEvent.click(screen.getByRole('button', { name: 'كتاب جديد' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'العنوان' }), 'التبيان');
    await userEvent.click(screen.getByRole('button', { name: 'حفظ' }));

    await waitFor(() => expect(http.countOf('POST /books')).toBe(1));
    const create = http.calls.find((c) => c.method === 'POST' && c.path === '/books');
    expect(create?.body).toMatchObject({ titleAr: 'التبيان' });
  });

  it('honours the tab named in the URL, so the retired /curriculum link still lands', async () => {
    renderCatalogue({}, '/catalogue?tab=subjects');
    expect(await screen.findByRole('tab', { name: 'المواد', selected: true })).toBeDefined();
  });
});
