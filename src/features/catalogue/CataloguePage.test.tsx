// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { CataloguePage } from './CataloguePage';
import type { Book, Level, Subject } from './catalogue.model';
import { makeStore } from '../../shared/api/store';
import { toQueryString, type Page } from '../../shared/api/pagination';
import { stubHttpClient, type StubRoutes } from '../../test/stub-http-client';
import '../../shared/i18n';

/* Proves the three catalogue tabs write correctly: a subject is created, a
   level's flags are edited, and a book is created. Real store and DataTable
   against a stub. */

const LEVEL: Level = { id: 1, code: 'L1', nameAr: 'المستوى الأول', sortOrder: 1, isOptional: false, isTerminal: false, allowsCarry: true, grantsCertificate: false, requiresCleanEntry: false };
const SUBJECT: Subject = { id: 1, code: 'ARABIC', nameAr: 'اللغة العربية', shortNameAr: null, nameEn: null, isActive: true, aliases: [] };
const BOOK: Book = { id: 1, titleAr: 'النحو الواضح', authorAr: 'علي الجارم', notes: null, isActive: true };

const subjectsKey = `GET /subjects?${toQueryString({ page: 1, pageSize: 25 })}`;
const booksKey = `GET /books?${toQueryString({ page: 1, pageSize: 25 })}`;

function page<T>(items: T[]): Page<T> {
  return { items, total: items.length, page: 1, pageSize: 25 };
}

function renderCatalogue(routes: StubRoutes) {
  const http = stubHttpClient({
    [subjectsKey]: page([SUBJECT]),
    'GET /levels': [LEVEL],
    [booksKey]: page([BOOK]),
    ...routes,
  });
  render(
    <Provider store={makeStore(http)}>
      <CataloguePage />
    </Provider>,
  );
  return http;
}

afterEach(cleanup);

describe('CataloguePage', () => {
  it('creates a subject', async () => {
    const http = renderCatalogue({ 'POST /subjects': { ...SUBJECT, id: 2 } });
    await screen.findByText('اللغة العربية'); // subjects tab is the default

    await userEvent.click(screen.getByRole('button', { name: 'مادة جديدة' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'الرمز' }), 'MATH');
    await userEvent.type(screen.getByRole('textbox', { name: 'الاسم بالعربية' }), 'الرياضيات');
    await userEvent.click(screen.getByRole('button', { name: 'حفظ' }));

    await waitFor(() => expect(http.countOf('POST /subjects')).toBe(1));
    const create = http.calls.find((c) => c.method === 'POST' && c.path === '/subjects');
    expect(create?.body).toMatchObject({ code: 'MATH', nameAr: 'الرياضيات' });
  });

  it("edits a level's flags", async () => {
    const http = renderCatalogue({ 'PATCH /levels/1': { ...LEVEL, isOptional: true } });
    await userEvent.click(screen.getByRole('tab', { name: 'المستويات' }));
    await screen.findByText('المستوى الأول');

    await userEvent.click(screen.getByRole('button', { name: 'تعديل' }));
    await userEvent.click(screen.getByRole('switch', { name: 'اختياري' }));
    await userEvent.click(screen.getByRole('button', { name: 'حفظ' }));

    await waitFor(() => expect(http.countOf('PATCH /levels/1')).toBe(1));
    const patch = http.calls.find((c) => c.method === 'PATCH' && c.path === '/levels/1');
    expect((patch?.body as { isOptional?: boolean } | undefined)?.isOptional).toBe(true);
  });

  it('creates a book', async () => {
    const http = renderCatalogue({ 'POST /books': { ...BOOK, id: 2 } });
    await userEvent.click(screen.getByRole('tab', { name: 'الكتب' }));
    await screen.findByText('النحو الواضح');

    await userEvent.click(screen.getByRole('button', { name: 'كتاب جديد' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'العنوان' }), 'التبيان');
    await userEvent.click(screen.getByRole('button', { name: 'حفظ' }));

    await waitFor(() => expect(http.countOf('POST /books')).toBe(1));
    const create = http.calls.find((c) => c.method === 'POST' && c.path === '/books');
    expect(create?.body).toMatchObject({ titleAr: 'التبيان' });
  });
});
