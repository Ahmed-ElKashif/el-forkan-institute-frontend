// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { StudentFields, emptyStudentValues, type StudentFieldValues } from './StudentFields';
import { makeStore } from '../../shared/api/store';
import { MAX_PAGE_SIZE, toQueryString, type Page } from '../../shared/api/pagination';
import { stubHttpClient, type StubRoutes } from '../../test/stub-http-client';
import { useState } from 'react';
import '../../shared/i18n';

/* The governorate → markaz cascade.

   This is a regression, and the bug it pins was invisible by construction: the
   markaz read asked for `pageSize=200` against an API that caps a page at 100,
   so every call was refused with a 400 — and a refused reference read renders
   exactly like an empty one, an empty <select>. The list looked "not seeded"
   for as long as it existed.

   The stub is keyed on the full URL, so a request with the wrong pageSize finds
   no route and fails loudly. That key IS the assertion. */

const GOVERNORATES = [{ id: 1, nameAr: 'أسوان' }];
const MARKAZES = [
  { id: 1, nameAr: 'إدفو', governorateId: 1 },
  { id: 2, nameAr: 'كوم أمبو', governorateId: 1 },
];

function page<T>(items: T[]): Page<T> {
  return { items, total: items.length, page: 1, pageSize: MAX_PAGE_SIZE };
}

const governoratesKey = `GET /governorates?${toQueryString({ page: 1, pageSize: MAX_PAGE_SIZE })}`;
const markazesKey = `GET /markazes?${toQueryString({ page: 1, pageSize: MAX_PAGE_SIZE, governorateId: 1 })}`;

/** The fields are controlled by their caller, so the test owns the state the
 *  way the real dialogs do — otherwise picking a governorate would not stick. */
function Harness() {
  const [values, setValues] = useState<StudentFieldValues>(emptyStudentValues);
  return (
    <StudentFields values={values} onChange={setValues} showStatus={false} canSeeNationalId={false} />
  );
}

function renderFields(routes: StubRoutes = {}) {
  const http = stubHttpClient({
    [governoratesKey]: page(GOVERNORATES),
    [markazesKey]: page(MARKAZES),
    ...routes,
  });
  render(
    <Provider store={makeStore(http)}>
      <Harness />
    </Provider>,
  );
  return http;
}

afterEach(cleanup);

describe('StudentFields — governorate → markaz', () => {
  it('loads the governorate’s مراكز once one is chosen', async () => {
    const http = renderFields();

    const governorate = await screen.findByRole('combobox', { name: 'المحافظة' });
    const markaz = screen.getByRole('combobox', { name: 'المركز' }) as HTMLSelectElement;
    // Nothing is read until a governorate is picked, and the field says so.
    expect(markaz.disabled).toBe(true);
    expect(http.countOf(markazesKey)).toBe(0);

    await screen.findByRole('option', { name: 'أسوان' });
    await userEvent.selectOptions(governorate, '1');

    await waitFor(() => expect(http.countOf(markazesKey)).toBe(1));
    expect(await screen.findByRole('option', { name: 'إدفو' })).toBeDefined();
    expect(screen.getByRole('option', { name: 'كوم أمبو' })).toBeDefined();
    expect((screen.getByRole('combobox', { name: 'المركز' }) as HTMLSelectElement).disabled).toBe(false);
  });

  it('asks for a page the API will actually serve', async () => {
    const http = renderFields();
    const governorate = await screen.findByRole('combobox', { name: 'المحافظة' });
    await screen.findByRole('option', { name: 'أسوان' });
    await userEvent.selectOptions(governorate, '1');
    await waitFor(() => expect(http.countOf(markazesKey)).toBe(1));

    const call = http.calls.find((c) => c.path.startsWith('/markazes'));
    const asked = Number(new URLSearchParams(call?.path.split('?')[1] ?? '').get('pageSize'));
    expect(asked).toBeLessThanOrEqual(MAX_PAGE_SIZE);
  });
});
